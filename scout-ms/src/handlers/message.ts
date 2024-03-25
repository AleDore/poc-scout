import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { MessagePayload } from "../utils/types";
import { upsertTableDocument } from "../utils/tableStorage";

export const defaultDocumentHandler =
  (documentUpserter: ReturnType<typeof upsertTableDocument>) =>
  (ampqDocument: MessagePayload, timestamp: Date): TE.TaskEither<Error, void> =>
    pipe(
      {
        rowKey: ampqDocument.fiscalCode,
        partitionKey: String(ampqDocument.initiative),
        timestamp: timestamp.getTime(),
      },
      documentUpserter
    );
