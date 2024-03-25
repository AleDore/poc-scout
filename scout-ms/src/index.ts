/* eslint-disable no-console */
import { defaultLog, useWinston, withConsole } from "@pagopa/winston-ts";
import dotenv from "dotenv";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

dotenv.config();
useWinston(withConsole());

export const CONFIG = {
  ALLOW_INSECURE_CONNECTION: "true" === process.env.ALLOW_INSECURE_CONNECTION,
  STORAGE_CONN_STRING: process.env.STORAGE_CONN_STRING,
};

const main = () => pipe(TE.of("TBD"), defaultLog.taskEither.info("consumed"))();

main()
  .then(console.log)
  .catch((error) => {
    console.error(error);
  });
