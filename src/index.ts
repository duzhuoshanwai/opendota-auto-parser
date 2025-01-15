interface Match {
	match_id: number;
	player_slot: number;
	radiant_win: boolean;
	duration: number;
	game_mode: number;
	lobby_type: number;
	hero_id: number;
	start_time: number;
	version: number;
	kills: number;
	deaths: number;
	assists: number;
	average_rank: number;
	leaver_status: number;
	party_size: number;
	hero_variant: number;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Please view https://dash.cloudflare.com/ Workers & Pages => opendota-auto-parser => logs.');
	},
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext,) {
		const steam32List: string[] = JSON.parse(env.STEAM32_LIST);
		steam32List.forEach(async steam32 => {
			const matchList = await getUnparsedMatches(steam32);
			if (Array.isArray(matchList) && matchList.length > 0) {
				console.log(`For ${steam32}, the following unparsed matches have been found.\n ${matchList}`);
				ctx.waitUntil(requestParse(matchList));
			} else{
				console.log(`No unparsed matches found for ${steam32}`);
			}
		});
		console.log(`All tasks are completed.`)
	},
} satisfies ExportedHandler<Env>;

async function getUnparsedMatches(steamId32: string) {
	try {
		console.log(`Fetching matches for ${steamId32}`);
		// recent 10 matches
		const url = `https://api.opendota.com/api/players/${steamId32}/matches?limit=10`
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': 'opendota-auto-parser'
			}
		});
		if (!response.ok) {
			console.error(`HTTP error! status: ${response.status}`);
		}
		const data: Array<Match> = await response.json();
		const match_list: Array<number> = [];
		data.forEach(match => {
			if (match.version === null) {
				match_list.push(match.match_id as number);
			}
		});
		return match_list;
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