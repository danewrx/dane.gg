import { describe, expect, mock, test } from 'bun:test';
import { bruteForceProtection } from './rateLimiting';

let uniqueIpSeq = 0;
function uniqueIp() {
	uniqueIpSeq += 1;
	const b = (uniqueIpSeq >> 8) % 250;
	const c = uniqueIpSeq % 250;
	const a = 10 + (uniqueIpSeq % 200);
	return `10.${a}.${b}.${c}`;
}

function mockRes() {
	let statusCode = 0;
	let body: unknown;
	const res = {
		headersSent: false,
		status(code: number) {
			statusCode = code;
			return res;
		},
		json(payload: unknown) {
			body = payload;
			return res;
		},
		getStatus() {
			return statusCode;
		},
		getBody() {
			return body;
		}
	};
	return res as unknown as { getStatus: () => number; getBody: () => unknown };
}

describe('bruteForceProtection', () => {
	test('calls next and exposes trackers on first visit', () => {
		const ip = uniqueIp();
		const req: Record<string, unknown> = { ip, connection: {} };
		const res = mockRes();
		const next = mock(() => {});

		bruteForceProtection(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(typeof req.trackFailedAttempt).toBe('function');
		expect(typeof req.resetFailedAttempts).toBe('function');
	});

	test('locks out IP after five failed attempts', () => {
		const ip = uniqueIp();
		const req: Record<string, unknown> = { ip, connection: {} };
		const res = mockRes();
		const next = mock(() => {});

		bruteForceProtection(req, res, next);
		const track = req.trackFailedAttempt as () => void;
		for (let i = 0; i < 5; i++) track();

		const next2 = mock(() => {});
		bruteForceProtection(req, res, next2);

		expect(next2).not.toHaveBeenCalled();
		expect(res.getStatus()).toBe(423);
		expect(String((res.getBody() as { message?: string })?.message)).toMatch(/locked|Try again/i);
	});

	test('resetFailedAttempts clears lock state for that IP', () => {
		const ip = uniqueIp();
		const req: Record<string, unknown> = { ip, connection: {} };
		const res = mockRes();

		bruteForceProtection(
			req,
			res,
			mock(() => {})
		);
		const track = req.trackFailedAttempt as () => void;
		const reset = req.resetFailedAttempts as () => void;
		for (let i = 0; i < 4; i++) track();
		reset();

		const next = mock(() => {});
		bruteForceProtection(req, res, next);
		expect(next).toHaveBeenCalled();
	});
});
