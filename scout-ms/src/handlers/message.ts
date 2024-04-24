import * as TE from "fp-ts/TaskEither";
import { MessagePayload } from "../utils/types";

import { upsertDocument } from "../utils/cosmos";

export const cosmosDocumentHandler =
  (documentUpserter: ReturnType<typeof upsertDocument>) =>
  (serviceBusMessage: MessagePayload): TE.TaskEither<Error, void> =>
    documentUpserter({
      initiativeOrder: `${serviceBusMessage.initiative}-${serviceBusMessage.sequenceNumber}`,
      id: serviceBusMessage.fiscalCode,
      timestamp: serviceBusMessage.timestamp,
      subscribed: false,
    });
