package models

import play.api.templates.Html

/**
 * Created with IntelliJ IDEA.
 * User: hiroyuki
 * Date: 4/17/14
 * Time: 12:45 AM
 * To change this template use File | Settings | File Templates.
 */
abstract class Renderer {
  def render(paper: Paper): Html
}

class RendererA extends Renderer {
  def render(paper: Paper): Html = {
    Html("<h1>Stub</h1>")
  }
}