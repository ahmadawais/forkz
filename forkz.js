#!/usr/bin/env node
// Setup the CLI.
var c = require('colors'),
	https = require('https'),
	opts = require('optimist')
		.usage("Count a GitHub user's total forks.")
		.demand(1)
		.alias('t', 'thresh')
		.alias('l', 'limit')
		.alias('a', 'auth')
		.default('t', 1)
		.default('l', Infinity)
		.describe({
			a: 'GitHub username:password for rate limits',
			t: 'Only show repos above this threshold',
			l: 'Only show this many repos'
		}).argv,
	user = opts._[0];

/**
 * Send request and compile all repos.
 */
request('/users/' + user, function(res) {
	// If there are no public repos or wrong username.
	if (!res.public_repos) {
		console.log(res.message);
		return;
	}
	
	// Total no of pages for repos, 100 per page
	var pages = Math.ceil(res.public_repos / 100),
		i = pages,
		repos = [];
	
	// Grab all the repos.
	while (i--) {
		request('/users/' + user + '/repos?per_page=100&page=' + (i + 1), check);
	}
	
	/**
	 * Call back function.
	 * 
	 * Concatenate all repos in an array, when done, prints the result.
	 * 
	 * @param {object} res Response object
	 */
	function check(res) {
		repos = repos.concat(res);
		pages--;
		if (!pages) output(repos);
	}
});

/**
 * Custom API Request fn.
 *
 * @param {string} url API URL
 * @param {fn} cb Callback
 */
function request(url, cb) {
	// Request Object.
	var reqOpts = {
		hostname: 'api.github.com',
		path: url,
		headers: { 'User-Agent': 'GitHub ForkCounter' },
		auth: opts.auth || undefined
	};
	
	// API Call.
	https
		.request(reqOpts, function(res) {
			var body = '';
			res
				.on('data', function(buf) {
					body += buf.toString();
				})
				.on('end', function() {
					cb(JSON.parse(body));
				});
		})
		.end();
}

/**
 * Output of CLI.
 *
 * @param {array} repos Repos array
 */
function output(repos) {
	var total = 0,
		longest = 0,
		list = repos // Filter the repos matching threshold.
			.filter(function(r) {
				// Add to total forks count.
				total += r.forks_count;
				// If forks count matches threhsold critereon.
				if (r.forks_count >= opts.thresh) {
					if (r.name.length > longest) {
						longest = r.name.length;
					}
					return true;
				}
			}) // Sort the repositories based on forks count.
			.sort(function(a, b) {
				return b.forks_count - a.forks_count;
			});
	
	// If results are more than limit.
	if (list.length > opts.limit) {
		// Cut down the results to limit.
		list = list.slice(0, opts.limit);
	}
	
	// Print the results on console.
	console.log('\nTotal: ' + total.toString().green + '\n');
	console.log(
		list
			.map(function(r) {
				return r.name + new Array(longest - r.name.length + 4).join(' ') + '🍴  '.yellow + r.forks_count;
			})
			.join('\n')
	);
	console.log();
}
