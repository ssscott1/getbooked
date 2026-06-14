import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  // rawBody: true enables req.rawBody for Stripe webhook signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
  );

  // CORS — restrict to the web app origin in production
  const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "http://localhost:3000").split(",");
  app.enableCors({ origin: allowedOrigins, credentials: true });

  const port = process.env["PORT"] ?? 3001;
  await app.listen(port);
  console.log(`GetBooked API listening on http://localhost:${port}/api/v1`);
}

bootstrap();
