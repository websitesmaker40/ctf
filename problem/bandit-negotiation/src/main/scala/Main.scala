import cats.effect.{IO, IOApp}
import org.http4s.{HttpRoutes, Response}
import org.http4s.dsl.io.*
import org.http4s.ember.server.EmberServerBuilder
import org.http4s.server.Router
import pdi.jwt.{Jwt, JwtOptions, JwtAlgorithm, JwtClaim}
import scala.util.{Success, Failure}
import com.comcast.ip4s.{Host, Port}
import scala.io.Source
import cats.effect.Resource
import org.http4s.headers._
import org.http4s.UrlForm
import cats.syntax.applicative.*

object Main extends IOApp.Simple:
  def readSecret: IO[String] = IO.blocking {
    val source = Source.fromFile("/run/secrets/jwt_secret")
    try source.mkString.trim
    finally source.close()
  }

  def parseJwt(token: String, secret: String): Either[String, JwtClaim] =
    Jwt.decode(token, secret, Seq(JwtAlgorithm.HS256)) match
      case Success(claim) =>
        implicit val clock = java.time.Clock.systemUTC()
        if (claim.isValid("charter-authority")) then
          Right(claim)
        else
          Left("Invalid issuer or audience")
      case Failure(ex) => Left(ex.getMessage)

  def makeRoutes(secret: String) = HttpRoutes.of[IO] {
    case GET -> Root / "enter" :? JwtQueryParamMatcher(token) =>
      parseJwt(token, secret) match
        case Right(_) =>
          val html = s"""
            |<!DOCTYPE html>
            |<html>
            |<head>
            |  <style>
            |    body {
            |      font-family: Arial, sans-serif;
            |      max-width: 600px;
            |      margin: 40px auto;
            |      padding: 20px;
            |      border: 1px solid #ccc;
            |      border-radius: 5px;
            |      background-color: #f9f9f9;
            |    }
            |    h2 {
            |      color: #333;
            |      border-bottom: 1px solid #ddd;
            |      padding-bottom: 10px;
            |    }
            |    .form-group {
            |      margin: 20px 0;
            |    }
            |    .footnote {
            |      font-size: 12px;
            |      color: #777;
            |      font-style: italic;
            |      margin-top: 20px;
            |      padding-top: 10px;
            |      border-top: 1px dashed #ddd;
            |    }
            |    button {
            |      background-color: #4CAF50;
            |      color: white;
            |      padding: 10px 15px;
            |      border: none;
            |      border-radius: 4px;
            |      cursor: pointer;
            |      font-size: 16px;
            |    }
            |    button:hover {
            |      background-color: #45a049;
            |    }
            |  </style>
            |</head>
            |<body>
            |  <h2>Bandit Protection Agreement</h2>
            |  <p>By accepting this agreement, you will receive protection from local bandits.</p>
            |  <form method="POST" action="/submit">
            |    <div class="form-group">
            |      <input type="checkbox" id="accept" name="accept" value="true">
            |      <label for="accept">I agree to receive protection from the bandits</label>
            |    </div>
            |    <input type="hidden" name="token" value="$token">
            |    <button type="submit">Submit Agreement</button>
            |  </form>
            |  <div class="footnote">
            |    <p>* Please be advised that accepting protection from bandits is technically an illegal act under local law.
            |    If discovered by the sheriff, you may be subject to arrest and prosecution.</p>
            |  </div>
            |</body>
            |</html>
            |""".stripMargin
          Ok(html).map(_.withContentType(`Content-Type`(org.http4s.MediaType.text.html)))
        case Left(error) => BadRequest(s"Failed to parse JWT: $error")

    case req @ POST -> Root / "submit" =>
      req.decode[org.http4s.UrlForm] { form =>
        val token = form.getFirst("token").getOrElse("")
        val accepted = form.getFirst("accept").contains("true")

        parseJwt(token, secret) match
          case Right(originalPayload) =>
            val updatedPayload = originalPayload.by("bandit-negotiation").to("charter-authority") + ("protected", accepted)
            val newToken = Jwt.encode(updatedPayload, secret, JwtAlgorithm.HS256)
            val host = sys.env.getOrElse("HOST", "localhost")
            val redirectUrl = s"http://charterauthority.$host/callback?service=bandit-negotiation&token=$newToken"
            IO.pure(
              Response[IO](status = org.http4s.Status.Found)
                .putHeaders(Location(org.http4s.Uri.unsafeFromString(redirectUrl)))
            )
          case Left(error) => BadRequest(s"Failed to process JWT: $error")
      }
  }

  object JwtQueryParamMatcher extends QueryParamDecoderMatcher[String]("jwt")

  def run =
    for
      secret <- readSecret
      _ <- EmberServerBuilder
        .default[IO]
        .withHost(Host.fromString("0.0.0.0").get)
        .withPort(Port.fromInt(80).get)
        .withHttpApp(Router("/" -> makeRoutes(secret)).orNotFound)
        .build
        .use(_ => IO.never)
    yield ()
