name := "bandit-negotiation"
version := "0.1.0"
scalaVersion := "3.3.1"

val http4sVersion = "0.23.25"
val jwtScalaVersion = "10.0.4"

libraryDependencies ++= Seq(
	"org.http4s"    %% "http4s-dsl"          % http4sVersion,
	"org.http4s"    %% "http4s-ember-server" % http4sVersion,
	"com.github.jwt-scala" %% "jwt-core"      % jwtScalaVersion,
	"org.scalatest" %% "scalatest"           % "3.2.17" % Test
)

