package models

import java.io.File
import java.net.URL

/**
 * Created with IntelliJ IDEA.
 * User: hiroyuki
 * Date: 4/15/14
 * Time: 10:14 PM
 * To change this template use File | Settings | File Templates.
 */

case class Paper (
  doi: Option[String] = None,
  url: String,
  title: Option[String] = None,
  journal: Option[String] = None,
  year: Option[Int] = None,
  volume: Option[String] = None,
  pageFrom: Option[String] = None,
  pageTo: Option[String] = None,
  abs: Option[String] = None,
  main: Option[String] = None,
  id: Option[Int] = None
)

object Paper {
  val default: Paper = Paper(None,"",None,None,None,None,None,None)
}

case class Reference (
  id: String,
  name: String,
  cit: Either[String,Citation] = Left("")
  )

case class Citation (
  doi: Option[String] = None,
  url: String,
  title: Option[String] = None,
  journal: Option[String] = None,
  year: Option[Int] = None,
  volume: Option[String] = None,
  pageFrom: Option[String] = None,
  pageTo: Option[String] = None
  )

