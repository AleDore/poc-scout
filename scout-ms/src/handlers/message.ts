import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { MessagePayload } from "../utils/types";
import { upsertTableDocument } from "../utils/tableStorage";
import { upsertDocument } from "../utils/cosmos";

export const tableStorageDocumentHandler =
  (documentUpserter: ReturnType<typeof upsertTableDocument>) =>
  (ampqDocument: MessagePayload): TE.TaskEither<Error, void> =>
    pipe(
      {
        rowKey: ampqDocument.fiscalCode,
        partitionKey: String(ampqDocument.initiative),
        subscribed: false,
        timestamp: ampqDocument.timestamp,
      },
      documentUpserter
    );

export const cosmosDocumentHandler =
  (documentUpserter: ReturnType<typeof upsertDocument>) =>
  (ampqDocument: MessagePayload): TE.TaskEither<Error, void> =>
    documentUpserter({
      initiative: String(ampqDocument.initiative),
      id: ampqDocument.fiscalCode,
      timestamp: ampqDocument.timestamp,
      subscribed: false,
    });
