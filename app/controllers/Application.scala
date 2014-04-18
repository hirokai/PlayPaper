package controllers

import play.api._
import play.api.mvc._
import play.api.Play.current
import play.api.db.DB
import anorm._
import controllers.WithProvider
import models.{RendererA, Parser, ACSParser, Paper}
import play.api.libs.json._
import scala.concurrent.Future
import scalax.io.{Resource, Output}
import java.security.MessageDigest
import java.net.URL
import java.util.Calendar
import java.text.SimpleDateFormat
import play.api.templates.Html

object Application extends Controller {
  def index = Action {
    Ok(views.html.index("Your new application is ready, huh?"))
  }

  def listDefault() = Action {Redirect(routes.Application.list(1))}
  def list(page: Int) = Action {
    import anorm._
    import play.api.db.DB

    DB.withConnection { implicit c =>
      // First retrieve the first row
      val firstRow = SQL("Select count(*) as c from Paper").apply().head

      // Next get the content of the 'c' column as Long
      val count = firstRow[Long]("c")

      val entryPerPage = 50
      val numPages: Int = count.toInt / entryPerPage + 1
      val offset = entryPerPage * (page-1)
      val papers: Stream[Paper] =
        SQL(s"Select doi,url,title,journal,year,volume,page_from,page_to,paper_id from Paper order by year desc, paper_id limit $offset, $entryPerPage")().map( row => {
        new Paper(
            doi = row[Option[String]]("doi"),
            url = row[String]("url"),
            title = row[Option[String]]("title"),
            journal = row[Option[String]]("journal"),
            year = row[Option[Short]]("year").map(_.toInt),
            volume = row[Option[String]]("volume"),
          pageFrom = row[Option[String]]("page_from"),
          pageTo = row[Option[String]]("page_to"),
          id = Some(row[Int]("paper_id"))
        )
      })
      Ok(views.html.list(count, numPages, page, papers))
    }
  }

  def addHistory = Action(parse.multipartFormData) { request =>
      val html = request.body.dataParts("html").mkString
      Logger.debug(html.length.toString)
      Ok("Okay")
  }

  def isSupported(url: String) = Action {
    Ok(Json.obj("supported" -> getParserFor(url).isDefined))
  }

//  val parserList: Array[Parser.type] = Array(ACSParser)

  import play.api.libs.concurrent.Execution.Implicits.defaultContext

  def addPaper() = Action.async(parse.urlFormEncoded) { request =>
    val url = request.body("url").mkString
    Future {
    DB.withConnection {implicit c =>
      //For now, if an entry with the same url already exists, do nothing.
      val pids: Array[Int] = SQL("SELECT paper_id from Paper where url={url}").on('url -> url)().map(row =>
        row[Int]("paper_id")
        ).toArray
      if(!pids.isEmpty){
        Ok(Json.obj("success" -> false, "message" -> "Already exists",
          "summary" -> Json.obj("id" -> pids(0))))
      }else{
        val html = request.body("html").mkString
        val outfile = new java.io.File("uploaded/"+sha256(url)+".html")
        val output:Output = Resource.fromFile(outfile)
        output.write(html)
        Logger.debug(html.length.toString)
        val parser = getParserFor(url)
        parser match {
          case Some(pa) => {
            val p = pa.parseHtmlFile(url,outfile)
              val id: Option[Long] = {
                val date = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ").format(Calendar.getInstance().getTime)
                SQL("Insert into Paper(title,doi,year,page_from,url,journal,html,abs,main,availability)"
                  + " values({title},{doi},{year},{pageFrom},{url},{journal},{html},{abs},{main},{availability})")
                  .on('title -> p.title, 'doi -> p.doi, 'added -> date, 'year -> p.year, 'pageFrom -> p.pageFrom, 'url -> url,
                  'journal -> p.journal, 'html -> html, 'abs -> p.abs, 'main -> p.main, 'availability -> mkAvailability(p)
                ).executeInsert()
              }
              Ok(Json.obj("success" -> true,
                "summary" -> Json.obj("id" -> id, "doi" -> p.doi, "url" -> p.url, "journal" -> p.journal,
                  "title" -> p.title)))
          }
          case _ => Ok(Json.obj("success" -> false, "message" -> "Parser not found."))
        }
      }
    }
    }
  }

  def mkAvailability(p: Paper): String = {
    def f[A](a: Option[A], s: String) = if(a.isDefined){s}else{""}
    Array(f(p.abs,"A"),f(p.main,"M")).mkString
  }

  def renderA(id: Int) = Action {
    DB.withConnection { implicit c =>
      val ps = SQL(s"Select * from Paper where paper_id = {pid}").on('pid -> id)().map( row => {
        Paper(
          doi = row[Option[String]]("doi"),
          url = row[String]("url"),
          title = row[Option[String]]("title"),
          journal = row[Option[String]]("journal"),
          year = row[Option[Short]]("year").map(_.toInt),
          volume = row[Option[String]]("volume"),
          pageFrom = row[Option[String]]("page_from"),
          pageTo = row[Option[String]]("page_to"),
          id = Some(row[Int]("paper_id")),
          abs = row[Option[String]]("abs")
        )
      })
      if(ps.isEmpty){
        NotFound(views.html.notFound())
      }else{
        val paper: Paper = ps.head
        Ok(views.html.renderA(paper))
      }
    }
  }

  def getParserFor(url: String): Option[Parser] = {
   if(url.contains("/pubs.acs.org/doi")){
    Some(new ACSParser)
   }else{
    None
   }
  }

  def sha256(s: String): String = {
    val digestedBytes = MessageDigest.getInstance("SHA-256").digest(s.getBytes)
    digestedBytes.map("%02x".format(_)).mkString
  }

  def uploadList = Action {Ok(views.html.uploadList())}

  def upload = Action(parse.multipartFormData) { request =>
    request.body.file("json").map { jsonfile =>
      import java.io.File
      val filename = jsonfile.filename
      val contentType = jsonfile.contentType
      val str: String = scala.io.Source.fromFile(jsonfile.ref.file).getLines.mkString("")

      import play.api.libs.json._
      val json: JsArray = Json.parse(str).as[JsArray]
      DB.withConnection { implicit c =>
       // val emails = SQL("Select email from User")().map {_[String]("email")}
        val ids: Seq[Long] = (for(pp <- json.value) yield {
          val p = pp.asInstanceOf[JsObject]
          val doi = (p \ "doi").as[String]
          val added = (p \ "addedDate").as[String]
          val cit = p \ "citation"
          val title = try {(cit \ "title").as[String]} catch {case e: Exception => ""}
          val journal = try {(cit \ "journal").as[String]} catch {case e: Exception => ""}
          val pageFrom = try {(cit \ "pageFrom").as[String]} catch {case e: Exception => ""}
          val url = (cit \ "url").as[String]
          val year: Int = {
            val y = try {(cit \ "year").as[Short]} catch {case e: Exception => -1}
            if(y <= 3000 && y >= 0){
              y
            }else{
              -1
            }
          }
          val id: Option[Long] = SQL("Insert into Paper(title,doi,year,page_from,url,journal) values({title},{doi},{year},{pageFrom},{url},{journal})")
            .on('title -> title, 'doi -> doi, 'added -> added, 'year -> year, 'pageFrom -> pageFrom, 'url -> url,
                'journal -> journal
          ).executeInsert()
          id
        }).flatten
//        jsonfile.ref.moveTo(new File(s"/Users/hiroyuki/Documents/PlayPaper/$filename"),true)
        Ok("File uploaded: %d bytes".format(str.length))
      }
    }.getOrElse {
      Redirect(routes.Application.index).flashing(
        "error" -> "Missing file")
    }
  }

  def preferences() = Action {
    Ok(views.html.preferences())
  }

  def reparseall() = Action.async {
    Future {
      DB.withConnection {implicit c =>
        //stub
        var count = 0
        val ids: Array[Int] = SQL("Select html,url,paper_id from Paper")().map( row => {
          count += 1
          val h: Option[String] = row[Option[String]]("html")
          val url: String = row[String]("url")
          Logger.debug(url)
          val pid: Int = row[Int]("paper_id")
          h match {
            case Some(html) => {
              val pp: Option[Paper] = getParserFor(url).map(_.parseHtml(url,html))
              pp match {
                case Some(p) =>
                  SQL("UPDATE Paper SET abs={abs}, main={main},"
                      + "year={year}, journal={journal}, volume={volume}, page_from={pf}, page_to={pt}"
                      + " WHERE paper_id={pid}")
                    .on('abs -> p.abs, 'main -> p.main, 'pid -> pid,
                        'year -> p.year, 'journal -> p.journal, 'volume -> p.volume, 'pf -> p.pageFrom, 'pt -> p.pageTo)
                    .executeUpdate()
                  Some(pid)
                case _ => None
              }
            }
            case _ => None
          }
        }).flatten.toArray
        Ok("Done: %d papers reparsed. IDs: %s".format(count,ids.mkString(",")))
      }
    }
  }

  def mkCitation(p: Paper): Html = {
    Html("<i>"+p.journal.getOrElse("")+"</i>, "
      +p.volume.map("<b>"+_+"</b>, ").getOrElse("")
      +p.pageFrom.getOrElse("")
      +p.pageTo.map("-"+_).getOrElse("")
      +p.year.map(" ("+_+")").getOrElse(""))
  }
}

import play.api._
import play.api.mvc._
import securesocial.core.Authorization
import securesocial.core.Identity
case class WithProvider(provider: String) extends Authorization {
  def isAuthorized(user: Identity) = {
    user.identityId.providerId == provider
  }
}
object  SecureSocialController extends Controller with securesocial.core.SecureSocial{
  def index = SecuredAction(WithProvider("facebook")) { implicit request =>
    Ok("index!")
  }
  def page = UserAwareAction { implicit request =>
    println(request.user)
    Ok("page!")
  }
}