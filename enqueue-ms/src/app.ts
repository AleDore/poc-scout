/* eslint-disable no-console */
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import express from "express";
import * as bodyParser from "body-parser";
import { pipe } from "fp-ts/lib/function";
import { getConfigOrThrow } from "./utils/config";
import { EnqueuePayload } from "./utils/types";
import { readableReport } from "./utils/logging";
import { createSender, publishMessage } from "./utils/service-bus";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createApp = async () => {
  const config = getConfigOrThrow();

  const BUS_SENDER = createSender(
    config.SERVICE_BUS_CONNECTION_STRING,
    config.SERVICE_BUS_TOPIC_NAME
  );
  const app = express();
  const port = 3000;
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

  app.post("/enqueue", (req: express.Request, res) =>
    pipe(
      req.body,
      EnqueuePayload.decode,
      E.mapLeft((errs) => Error(readableReport(errs))),
      TE.fromEither,
      TE.chainW((payload) =>
        publishMessage(payload.initiative)(BUS_SENDER, payload)
      ),
      TE.map(() => res.status(200).json({ status: "OK" })),
      TE.mapLeft((err) => res.status(500).json({ error: String(err) })),
      TE.toUnion
    )()
  );

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`enqueue-ms app listening on port ${port}`);
  });
};

createApp().then(console.log).catch(console.error);
