/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { check, sleep } from "k6";
import http from "k6/http";
import * as NAR from "fp-ts/lib/NonEmptyArray";
import { pipe } from "fp-ts/lib/function";
import { getConfigOrThrow } from "./utils/config";
import { generateDocument } from "./utils/generator";

const config = getConfigOrThrow();

export const options = {
  scenarios: {
    contacts: {
      duration: config.duration, // e.g. '1m'
      executor: "constant-arrival-rate",
      maxVUs: config.maxVUs, // e.g. 1000
      preAllocatedVUs: config.preAllocatedVUs, // e.g. 500
      rate: config.rate // e.g. 20000 for 20K iterations
    }
  },
  thresholds: {
    http_req_duration: ["p(99)<1500"], // 99% of requests must complete below 1.5s
    "http_req_duration{api:newDocument}": ["p(95)<1000"],
    "http_req_duration{api:upsertDocument}": ["p(95)<1000"]
  }
};

const headers = {
  "Content-Type": "application/json"
};

export default function() {
  // Values from env var.
  const crudBaseUrl = `${config.CRUD_BASE_URL}`;
  const url = `${crudBaseUrl}/enqueue`;

  pipe(
    NAR.range(1, 100),
    NAR.map(() =>
      pipe(
        generateDocument(),
        document =>
          http.post(url, JSON.stringify(document), {
            ...{
              headers: {
                ...headers,
                "Content-Length": `${JSON.stringify(document).length}`
              }
            },
            tags: { api: "enqueue" }
          }),
        res =>
          check(
            res,
            { "subscription status was 200": r => r.status === 200 },
            { tags: JSON.stringify({ api: "enqueue" }) }
          )
      )
    ),
    () => sleep(2)
  );
}
