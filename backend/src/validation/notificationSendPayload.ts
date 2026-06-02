import { NotificationService } from '../services/notificationService';
import { mergeNtfyAppearance, NTFY_APPEARANCE_OPTIONAL_DEFAULTS } from '../services/ntfyPublish';

export type CustomSendRequest = {
	kind: 'custom';
	message: string;
	title?: string;
	priority: number;
	tags?: string[];
	topic: string;
	appearance?: object;
};

export type SendNotificationRequest = { kind: 'test' } | CustomSendRequest;

type ParseSuccess = { ok: true; request: SendNotificationRequest };
type ParseFailure = { ok: false; error: string };
export type ParseSendNotificationResult = ParseSuccess | ParseFailure;

export type SendHandlerResult =
	| { status: 200; body: Record<string, unknown> }
	| { status: 400; error: string }
	| { status: 500; error: string };

function isValidPriority(priority: unknown): priority is number {
	return typeof priority === 'number' && priority >= 1 && priority <= 5;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((tag) => typeof tag === 'string');
}

function parseCustomSend(body: Record<string, unknown>): ParseSendNotificationResult {
	const { message, title, priority, tags, topic, appearance } = body;

	if (!message || typeof message !== 'string') {
		return { ok: false, error: 'Message is required and must be a string' };
	}

	if (priority !== undefined && !isValidPriority(priority)) {
		return { ok: false, error: 'Priority must be a number between 1 and 5' };
	}

	if (tags !== undefined && !isStringArray(tags)) {
		return { ok: false, error: 'Tags must be an array of strings' };
	}

	const finalTopic = (typeof topic === 'string' && topic) || process.env.NTFY_TOPIC;
	if (!finalTopic) {
		return {
			ok: false,
			error: 'No topic provided and NTFY_TOPIC environment variable is not set'
		};
	}

	return {
		ok: true,
		request: {
			kind: 'custom',
			message,
			title: typeof title === 'string' ? title : undefined,
			priority: typeof priority === 'number' ? priority : 3,
			tags: isStringArray(tags) ? tags : undefined,
			topic: finalTopic,
			appearance: appearance && typeof appearance === 'object' ? appearance : undefined
		}
	};
}

export function parseSendNotificationRequest(body: unknown): ParseSendNotificationResult {
	if (!body || typeof body !== 'object') {
		return { ok: false, error: 'Message is required and must be a string' };
	}

	const record = body as Record<string, unknown>;
	if (record.useTestPreset === true) {
		return { ok: true, request: { kind: 'test' } };
	}

	return parseCustomSend(record);
}

async function sendCustomNotification(request: CustomSendRequest): Promise<boolean> {
	const { message, title, priority, tags, topic, appearance } = request;

	if (appearance) {
		const resolvedAppearance = mergeNtfyAppearance(
			{
				enabled: true,
				title: title ?? 'Notification',
				body: message,
				priority,
				tags: tags ?? [],
				...NTFY_APPEARANCE_OPTIONAL_DEFAULTS
			},
			appearance
		);
		return NotificationService.sendWithAppearance(message, resolvedAppearance, topic);
	}

	return NotificationService.send(message, title, priority, tags, topic);
}

export async function executeTestPresetSend(): Promise<SendHandlerResult> {
	if (!NotificationService.isConfigured()) {
		return { status: 400, error: 'NTFY_TOPIC environment variable is not set' };
	}

	const success = await NotificationService.sendTestNotification();
	if (!success) {
		return { status: 500, error: 'Failed to send test notification' };
	}

	return {
		status: 200,
		body: {
			success: true,
			message: 'Test notification sent using saved template',
			topic: process.env.NTFY_TOPIC
		}
	};
}

export async function executeCustomSend(request: CustomSendRequest): Promise<SendHandlerResult> {
	const success = await sendCustomNotification(request);
	if (!success) {
		return { status: 500, error: 'Failed to send notification' };
	}

	return {
		status: 200,
		body: {
			success: true,
			message: 'Notification sent successfully',
			topic: request.topic
		}
	};
}
