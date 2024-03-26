import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";

export enum InitiativeEnum {
  FOO = "foo",
  BAR = "bar",
}

export const Initiative = t.union([
  t.literal(InitiativeEnum.FOO),
  t.literal(InitiativeEnum.BAR),
]);
export type Initiative = t.TypeOf<typeof Initiative>;

export const MessagePayload = t.type({
  fiscalCode: FiscalCode,
  initiative: Initiative,
  timestamp: t.number,
});
export type MessagePayload = t.TypeOf<typeof MessagePayload>;

export const MassiveSubscribePayload = t.type({
  numberOfSubscriptions: NonNegativeInteger,
});
export type MassiveSubscribePayload = t.TypeOf<typeof MassiveSubscribePayload>;

export type DocumentUpserter<T> = (document: T) => TE.TaskEither<Error, void>;
