/* eslint-disable no-console */
import * as TE from "fp-ts/lib/TaskEither";
import * as AR from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import express from "express";
import * as bodyParser from "body-parser";
import { pipe } from "fp-ts/lib/function";
import { getConfigOrThrow } from "./utils/config";
import { initializeConsumers } from "./utils/service-bus";
import { InitiativeEnum, MassiveSubscribePayload } from "./utils/types";
import { readableReport } from "./utils/logging";
import {
  cosmosConnect,
  createContainerIfNotExists,
  createDatabaseIfNotExists,
  getDocuments,
  upsertDocument,
} from "./utils/cosmos";
import { serviceBusHandler } from "./handlers/service-bus";
import { cosmosDocumentHandler } from "./handlers/message";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createApp = async () => {
  const config = getConfigOrThrow();

  const initializeCosmos = pipe(
    cosmosConnect(config.COSMOS_ENDPOINT, config.COSMOS_KEY),
    TE.chain((client) =>
      createDatabaseIfNotExists(client, config.COSMOS_DATABASE)
    ),
    TE.chain((database) =>
      createContainerIfNotExists(database, {
        id: config.COSMOS_CONTAINER,
        partitionKey: { paths: ["/initiativeOrder"] },
        indexingPolicy: {
          automatic: true,
          includedPaths: [
            {
              path: "/*",
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    ),
    TE.getOrElse((e) => {
      throw e;
    })
  );

  const CONTAINER = await initializeCosmos();

  const CONSUMERS = await pipe(
    initializeConsumers(
      config.SERVICE_BUS_CONNECTION_STRING,
      config.SERVICE_BUS_TOPIC_NAME,
      [InitiativeEnum.FOO]
    ),
    TE.getOrElse((err) => {
      throw err;
    })
  )();

  const app = express();
  const port = 3001;
  // Parse the incoming request body. This is needed by Passport spid strategy.
  app.use(
    bodyParser.json({
      verify: (_req, res: express.Response, buf, _encoding: BufferEncoding) => {
        // eslint-disable-next-line functional/immutable-data
        res.locals.body = buf;
      },
    })
  );

  // Parse an urlencoded body.
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get("/info", (_: express.Request, res) =>
    res.status(200).json({ status: "OK" })
  );

  app.get("/search", (_: express.Request, res) =>
    pipe(
      getDocuments(CONTAINER)("initiative", "foo"),
      TE.map((docs) => res.status(200).json({ items: docs })),
      TE.mapLeft((err) => res.status(500).json({ error: String(err) })),
      TE.toUnion
    )()
  );

  app.post("/subscribe", (req: express.Request, res) =>
    pipe(
      req.body,
      MassiveSubscribePayload.decode,
      E.mapLeft((errs) =>
        res.status(400).json({ error: readableReport(errs) })
      ),
      TE.fromEither,
      TE.map(() => res.status(200).json({ status: "OK" })),
      TE.mapLeft((err) => res.status(500).json({ error: String(err) })),
      TE.toUnion
    )()
  );

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`scout-ms app listening on port ${port}`);
  });

  const runServiceBusHandlers = pipe(
    CONTAINER,
    upsertDocument,
    cosmosDocumentHandler,
    (docHandler) =>
      pipe(
        Object.entries(CONSUMERS),
        (entries) =>
          entries.map(([_, receiver]) =>
            serviceBusHandler(receiver)(docHandler)
          ),
        AR.sequence(TE.ApplicativePar)
      ),
    TE.toUnion
  );

  void runServiceBusHandlers();
};

createApp().then(console.log).catch(console.error);
