import {
  Container,
  ContainerRequest,
  CosmosClient,
  Database,
} from "@azure/cosmos";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import { constVoid, pipe } from "fp-ts/lib/function";
import { asyncIterableToArray } from "./async";

export const upsertDocument =
  <T>(container: Container) =>
  (payload: T): TE.TaskEither<Error, void> =>
    pipe(
      TE.tryCatch(
        () => container.items.upsert(payload),
        (reason) =>
          new Error(`Impossible to Upsert document: " ${String(reason)}`)
      ),
      TE.map(constVoid)
    );

export const getDocuments =
  (container: Container) =>
  (
    pkFieldName: string,
    partitionKeyValue: string
  ): TE.TaskEither<Error, unknown> =>
    pipe(
      container.items.query({
        query: `SELECT TOP 50 * FROM c WHERE c.${pkFieldName} = @pk ORDER BY c.timestamp ASC`,
        parameters: [{ name: "@pk", value: partitionKeyValue }],
      }),
      (iterator) => iterator.getAsyncIterator(),
      (asyncIterator) =>
        TE.tryCatch(
          () => asyncIterableToArray(asyncIterator),
          (reason) =>
            new Error(`Impossible to Read documents: " ${String(reason)}`)
        ),
      TE.map((feedResponses) =>
        feedResponses.map((feedResponse) => feedResponse.resources)
      ),
      TE.map(RA.flatten)
    );

export const cosmosConnect = (
  endpoint: string,
  key: string
): TE.TaskEither<Error, CosmosClient> =>
  pipe(
    E.tryCatch(
      () => new CosmosClient({ endpoint, key }),
      (reason) =>
        new Error(`Impossible to connect to Cosmos: " ${String(reason)}`)
    ),
    TE.fromEither
  );

export const getContainer =
  (cosmosClient: CosmosClient) =>
  (dbName: string, containerName: string): Container =>
    pipe(cosmosClient.database(dbName).container(containerName));

export const createDatabaseIfNotExists = (
  client: CosmosClient,
  id: string
): TE.TaskEither<Error, Database> =>
  pipe(
    TE.tryCatch(
      () =>
        client.databases.createIfNotExists({
          id,
        }),
      (reason) =>
        new Error(`Impossible to create database: " ${String(reason)}`)
    ),
    TE.map((response) => response.database)
  );

export const createContainerIfNotExists = (
  database: Database,
  containerRequest: ContainerRequest
): TE.TaskEither<Error, Container> =>
  pipe(
    TE.tryCatch(
      () => database.containers.createIfNotExists(containerRequest),
      (reason) =>
        new Error(`Impossible to create container: " ${String(reason)}`)
    ),
    TE.map((response) => response.container)
  );
