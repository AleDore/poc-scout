/* eslint-disable no-console */

import { AMQPQueue } from "@cloudamqp/amqp-client";
import * as TE from "fp-ts/TaskEither";

export const ampqHandler =
  <T>(_queue: AMQPQueue) =>
  (
    _documentHandler: (ampqDocument: T) => TE.TaskEither<Error, boolean>
  ): TE.TaskEither<Error, string> =>
    TE.of("TBD");
