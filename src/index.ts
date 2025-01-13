export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext,) {
		console.log('Scheduled event triggered');
		const matchList = await getUnparsedMatches(env.STEAM32);
		if (Array.isArray(matchList) && matchList.length > 0) {
			ctx.waitUntil(requestParse(matchList));
		}
	},
} satisfies ExportedHandler<Env>;

async function getUnparsedMatches(steamId32: string) {
	try {
		// recent 10 matches
		const url = `https://api.opendota.com/api/players/${steamId32}/matches?limit=10`
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': 'opendota-auto-parser'
			}
		});
		const data = await response.json();

		if (Array.isArray(data) && data.length > 0) {
			const match_list: Array<number> = [];
			data.forEach(match => {
				if (match.version === null) {
					match_list.push(match.match_id as number);
				}
			});
			console.log(`find unparsed match: ${JSON.stringify(match_list)}`);
			return match_list;
		}
	} catch (error) {
		console.error('error when fetching data:', error);
		return error;
	}
}

async function requestParse(matchList: Array<number>) {
	const requests = matchList.map(async match => {
		const url = `https://api.opendota.com/api/request/${match}`;
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'opendota-auto-parser'
				},
			});
			if (response.status === 200) {
				console.log(`Successfully requested parsing for match ${match}`);
				return true;
			} else {
				console.error(`Error requesting parse for match ${match}: ${response.statusText}`);
				return false;
			}
		} catch (error) {
			console.error(`Error requesting parse for match ${match}: ${error}`);
			return false;
		}
	});

	const results = await Promise.all(requests);
	console.log(`All parsing requests completed: ${results.every(result => result)}`);
	return results.every(result => result);
}