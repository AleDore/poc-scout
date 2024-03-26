/* eslint-disable no-console */
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as express from "express";
import * as bodyParser from "body-parser";
import { pipe } from "fp-ts/lib/function";
import { getConfigOrThrow } from "./utils/config";
import { initializePublishers, publishMessage } from "./utils/rabbit";
import { InitiativeEnum, EnqueuePayload } from "./utils/types";
import { readableReport } from "./utils/logging";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createApp = async () => {
  const config = getConfigOrThrow();

  const PUBLISHERS = await pipe(
    initializePublishers(config.AMPQ_CONNECTION_STRING, [InitiativeEnum.FOO]),
    TE.getOrElse((err) => {
      throw err;
    })
  )();
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
        pipe(PUBLISHERS[payload.initiative], (publisher) =>
          publishMessage(payload.initiative)(publisher, {
            ...payload,
            timestamp: Date.now(),
          })
        )
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
