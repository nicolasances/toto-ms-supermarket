import fs from 'fs'
import moment from 'moment-timezone';
import { Request } from "express";
import { Storage } from "@google-cloud/storage";
import { TotoDelegate } from 'toto-api-controller/dist/model/TotoDelegate';
import { UserContext } from 'toto-api-controller/dist/model/UserContext';
import { ExecutionContext } from 'toto-api-controller/dist/model/ExecutionContext';
import { ControllerConfig } from '../../Config';
import { correlationId } from '../../util/CorrelationId';
import { ValidationError } from 'toto-api-controller/dist/validation/Validator';
import { TotoRuntimeError } from 'toto-api-controller/dist/model/TotoRuntimeError';

const storage = new Storage();

export class StartBackup implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const logger = execContext.logger;
        const cid = execContext.cid ?? correlationId();
        const bucketName = String(process.env.BACKUP_BUCKET);

        const today = moment()
        const twoDaysAgo = moment().add(-2, "days");

        let client;

        try {

            logger.compute(cid, `Starting Database Backup`)

            const config = execContext.config as ControllerConfig;

            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            // Iterate through the relevant collections
            for (let collection of Object.keys(config.getCollections())) {

                logger.compute(cid, `Starting Backup of collection [${collection}]`)

                // Get a cursor to scan that collection
                const cursor = db.collection(collection).find();

                // Define the name of the file, as the current date (YYYYMMDD) followed by the name of the collection
                const filename = `${today.format("YYYYMMDD")}-${collection}.json`;

                fs.writeFileSync(filename, "");

                // Write line by line
                while (await cursor.hasNext()) {

                    const doc = await cursor.next();

                    fs.appendFileSync(filename, `${JSON.stringify(doc)}\n`);

                }

                // Upload the file to GCS
                const bucket = storage.bucket(bucketName)

                await bucket.upload(filename)

                // Delete the local file
                fs.rmSync(filename, { force: true })

                // Delete old file on GCS
                // Name of the file to delete
                const filenameToDelete = `${twoDaysAgo.format("YYYYMMDD")}-${collection}.json`;

                // Delete old file
                bucket.file(filenameToDelete).delete({ignoreNotFound: true})

                logger.compute(cid, `Backup of collection [${collection}] completed and uploaded on Bucket [${bucketName}]. Filename [${filename}]`)

            }

            logger.compute(cid, `Database Backup completed`)

            return { backup: "done" }

        } catch (error) {

            logger.compute(cid, `${error}`, "error")

            if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                throw error;
            }
            else {
                console.log(error);
                throw error;
            }

        }
        finally {
            if (client) client.close();
        }
    }

}