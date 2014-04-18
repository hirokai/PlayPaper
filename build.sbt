name := "PlayPaper"

version := "1.0-SNAPSHOT"

libraryDependencies ++= Seq(
  jdbc,
  anorm,
  cache,
       "ws.securesocial" %% "securesocial" % "2.1.3",
      "org.xerial" % "sqlite-jdbc" % "3.7.2",
"org.seleniumhq.webdriver" % "webdriver-selenium" % "0.9.7376",
"org.seleniumhq.webdriver" % "webdriver-htmlunit" % "0.9.7376"
       )


play.Project.playScalaSettings

