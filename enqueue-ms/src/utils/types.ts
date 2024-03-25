import { FiscalCode } from "@pagopa/ts-commons/lib/strings";

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

export const EnqueuePayload = t.type({
  fiscalCode: FiscalCode,
  initiative: Initiative,
});
export type EnqueuePayload = t.TypeOf<typeof EnqueuePayload>;
