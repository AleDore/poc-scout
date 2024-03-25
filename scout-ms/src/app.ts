/* eslint-disable no-console */
import * as TE from "fp-ts/lib/TaskEither";
import * as AR from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import express from "express";
import * as bodyParser from "body-parser";
import { pipe } from "fp-ts/lib/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { getConfigOrThrow } from "./utils/config";
import { initializeConsumers } from "./utils/rabbit";
import { InitiativeEnum, MassiveSubscribePayload } from "./utils/types";
import { readableReport } from "./utils/logging";
import {
  createTableIfNotExists,
  getTableClient,
  getTableServiceClient,
  upsertTableDocument,
} from "./utils/tableStorage";
import { defaultDocumentHandler } from "./handlers/message";
import { ampqHandler } from "./handlers/ampq";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createApp = async () => {
  const config = getConfigOrThrow();

  const initializeTableStorage = pipe(
    getTableServiceClient(config.STORAGE_CONN_STRING),
    (client) => createTableIfNotExists(client, "scout" as NonEmptyString)
  );
  await initializeTableStorage();

  const CONSUMERS = await pipe(
    initializeConsumers(config.AMPQ_CONNECTION_STRING, [InitiativeEnum.FOO]),
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
    console.log(`Example app listening on port ${port}`);
  });

  const runAmpqHandlers = pipe(
    getTableClient(config.STORAGE_CONN_STRING, "scout"),
    upsertTableDocument,
    defaultDocumentHandler,
    (docHandler) =>
      pipe(
        Object.entries(CONSUMERS),
        (entries) =>
          entries.map(([_, queue]) => ampqHandler(queue)(docHandler)),
        AR.sequence(TE.ApplicativePar)
      ),
    TE.toUnion
  );

  await runAmpqHandlers();
};

createApp().then(console.log).catch(console.error);
