package models

import java.io.File
import java.net.URL
import scalax.io.{Output, Resource}
import scala.util.Random
import play.api.libs.Files.TemporaryFile

/**
 * Created with IntelliJ IDEA.
 * User: hiroyuki
 * Date: 4/17/14
 * Time: 1:18 PM
 * To change this template use File | Settings | File Templates.
 */

abstract class Parser {
  def supported(url: String): Boolean
  def parseHtmlFile(url: String, file: File): Paper

  //Stub...
  def parseHtml(url: String, html: String): Paper = {
    val file = new File("tmp/"+Random.alphanumeric.take(20).mkString)
    val output:Output = Resource.fromFile(file)
    output.write(html)
    val tmpfile = TemporaryFile(file)
    parseHtmlFile(url, file)
  }
}

object Parser {
  val driver = new org.openqa.selenium.htmlunit.HtmlUnitDriver
}

class ACSParser extends Parser {


  def supported(url: String): Boolean = url.contains("/pubs.acs.org/doi")


    def parseHtmlFile(url: String, file: File): Paper = {

//    val journal: Option[String] = {
//      if(url.contains("10.1021/nl")){
//        Some("Nano. Lett.")
//      }else{
//        None
//      }
//    }
    val driver = Parser.driver
    val urllocal = new URL("file://"+System.getProperty("user.dir") + File.separator + file.getPath)
    driver.get(urllocal.toString)

    val doi: Option[String] = getm(driver,"dc.Identifier")

    val titlee = byPath(driver,"//h1[@class='articleTitle']")
    val title: Option[String] = getc(titlee)


    val abs = getc(byPath(driver, "//p[@class='articleBody_abstractText']"))

    val cit = getc(driver.findElementsByXPath("//div[@id='citation']"))
    val (journal,year,volume,pageFrom,pageTo) = cit match {
      case Some(s) => {
        val reg = """(.+?),\s*(\d{4}),\s+(\S+)\s+\(.+?\), pp (\w+).(\w+)""".r
        val reg2 = """(.+), Article ASAP""".r
        reg.findFirstIn(s) match {
          case Some(reg(j,y,v,pf,pt)) => {
//            println("regex match")
            (Some(j),Some(y.toInt),Some(v),Some(pf),Some(pt))
          }
          case _ => {
            reg2.findFirstIn(s) match {
              case Some(reg2(j)) => (Some(j),None,None,Some("ASAP"),None)
              case _ => (None,None,None,None,None)
            }
          }
        }
      }
      case _ =>{
//        println("elem not found")
        (None,None,None,None,None)
      }
    }


    val p = Paper(journal = journal, doi = doi, title = title, url = url, year = year,
      volume=volume, pageFrom=pageFrom,pageTo=pageTo,
      abs = abs)
    //println(p)
    p
  }

  def byPath(driver: org.openqa.selenium.htmlunit.HtmlUnitDriver, path: String): java.util.List[org.openqa.selenium.WebElement]
    = driver.findElementsByXPath(path)

  def getc(elem: java.util.List[org.openqa.selenium.WebElement]): Option[String] = {
    if(!elem.isEmpty){
      val r: String = elem.get(0).getText //stub: only visible text  http://selenium.googlecode.com/git/docs/api/java/org/openqa/selenium/WebElement.html
      Option(r)
    }else{
      None
    }
  }

  import org.openqa.selenium.htmlunit._

  def getm(driver: HtmlUnitDriver, name: String): Option[String] = {
    val elem: java.util.List[org.openqa.selenium.WebElement] = driver.findElementsByXPath("//meta[@name='%s']".format(name))
    if(!elem.isEmpty){
      val r: String = elem.get(0).getAttribute("content")
      Option(r)
    }else{
      None
    }
  }
}