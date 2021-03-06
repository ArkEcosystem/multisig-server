import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import mm from "micromatch";
import { RateLimiterMemory, RLWrapperBlackAndWhite } from "rate-limiter-flexible";

interface RateLimitResult {
	msBeforeNext: number;
	remainingPoints: number;
	consumedPoints: number;
	isFirstInDuration: boolean;
}

const isListed = (ip: string, patterns: string[]): boolean => {
	if (!Array.isArray(patterns)) {
		return true;
	}

	for (const pattern of patterns) {
		if (mm.isMatch(ip, pattern)) {
			return true;
		}
	}

	return false;
};

export const plugin = {
	name: "rate-limit",
	version: "1.0.0",
	once: true,
	async register(
		server: Hapi.Server,
		options: { points: number; duration: number; whitelist: string; blacklist: string },
	): Promise<void> {
		const whiteList = options.whitelist.split(",") || ["*"];
		const blackList = options.blacklist.split(",") || [];

		const rateLimiter = new RLWrapperBlackAndWhite({
			limiter: new RateLimiterMemory({ points: options.points, duration: options.duration }),
			whiteList,
			blackList,
			isWhiteListed: (ip: string) => isListed(ip, whiteList),
			isBlackListed: (ip: string) => isListed(ip, blackList),
			runActionAnyway: false,
		});

		server.ext({
			type: "onPostAuth",
			async method(request, h) {
				try {
					const result: RateLimitResult = await rateLimiter.consume(request.info.remoteAddress, 1);

					// @ts-ignore
					request.headers["Retry-After"] = result.msBeforeNext / 1000;
					// @ts-ignore
					request.headers["X-RateLimit-Limit"] = options.points;
					// @ts-ignore
					request.headers["X-RateLimit-Remaining"] = result.remainingPoints;
					// @ts-ignore
					request.headers["X-RateLimit-Reset"] = new Date(Date.now() + result.msBeforeNext);
				} catch (error) {
					if (error instanceof Error) {
						return Boom.internal(error.message);
					}

					const tooManyRequests = Boom.tooManyRequests();
					/* istanbul ignore next */
					tooManyRequests.output.headers["Retry-After"] = `${Math.round(error.msBeforeNext / 1000) || 1}`;

					return tooManyRequests;
				}

				return h.continue;
			},
		});
	},
};
