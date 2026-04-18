import { GCPPubSubImpl } from "totoms/dist/evt/impl/gcp/GCPPubSubImpl";
import { SNSImpl } from "totoms/dist/evt/impl/aws/SNSImpl";
import { IPubSub, MessageDestination, TotoMessage, getHyperscalerConfiguration } from "totoms";
import { ControllerConfig } from "../Config";
import { ListItem } from "../model/ListItem";
import moment from "moment-timezone";

let pubsubImpl: IPubSub | undefined;
let physicalTopicName: string | undefined;

async function getOrCreatePubSubImpl(config: ControllerConfig): Promise<{ impl: IPubSub; topicName: string }> {

    if (pubsubImpl && physicalTopicName) return { impl: pubsubImpl, topicName: physicalTopicName };

    const hyperscalerConfig = getHyperscalerConfiguration();
    const hyperscaler = process.env.HYPERSCALER || "gcp";
    const secretsManager = config.getSecretsManager();

    physicalTopicName = await secretsManager.getSecret("topic-name-supermarket");

    if (hyperscaler === "gcp") {
        pubsubImpl = new GCPPubSubImpl({ expectedAudience: config.getExpectedAudience() });
    } else if (hyperscaler === "aws") {
        const awsConfig = hyperscalerConfig as { awsRegion: string };
        pubsubImpl = new SNSImpl({ awsRegion: awsConfig.awsRegion });
    } else {
        throw new Error(`Unsupported hyperscaler: ${hyperscaler}`);
    }

    return { impl: pubsubImpl, topicName: physicalTopicName };
}

export async function publishItemAdded(
    config: ControllerConfig,
    cid: string,
    itemId: string,
    item: ListItem,
    authToken: string
): Promise<void> {

    const { impl, topicName } = await getOrCreatePubSubImpl(config);

    const timestamp = moment().tz("Europe/Rome").format("YYYY.MM.DD HH:mm:ss");

    const message: TotoMessage = {
        timestamp,
        cid,
        id: itemId,
        type: "itemAdded",
        msg: `Item [${itemId}] added to the Supermarket List`,
        data: { item, authToken }
    };

    await impl.publishMessage(new MessageDestination({ topic: topicName }), message);
}
