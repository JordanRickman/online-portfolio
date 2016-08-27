var app = {};
app.BASE_URL = "http://localhost:8000/" // TODO Modify in production

//===== Helper Functions =====
function escapeHtml(str) {
	var div = document.createElement('div');
	div.appendChild(document.createTextNode(str));
	return div.innerHTML;
};

//===== Core Functions =====
app.eval = function(input_text) {
	var text_words = input_text.split(" ");
	var command = text_words[0];
	var arguments = text_words.slice(1).join(" ");
	console.log(command + '("' + arguments+'")'); // DEBUG
	if ( typeof app.commands[command] == "function" ) {
		app.commands[command](arguments);
	} else {
		app.outputLines(["Command not found: "+escapeHtml(command)]);
	}
};

// This handler is called by the input form
app.handleInput = function() {
	var input_text = d3.select("#input").node().value;
	app.eval(input_text);
	d3.select("#input").property("value", ""); // Clear input box
	return false; // Do not bubble event upwards
};

app.outputLines = function(lines) {
	var output_lines = d3.select("#output-lines")
		.selectAll("li.output-line")
		.data(lines);
	// Insert new lines
	output_lines.enter().append("li")
		.attr("class", "output-line");
	// Modify lines
	output_lines.html(function(d) { return d; });
	// Remove extra lines
	output_lines.exit().remove();
	// Update scrollbar
	var container = document.getElementById("output-lines");
	Ps.update(container);
};

//TODO Use d3 transitions to fade in/out
app.showLightbox = function() {
	d3.select("#lightbox-dimmer").style("display", "block");
	d3.select("#lightbox").style("display", "block");
	var lightboxContent = document.getElementById('lightbox-content');
	Ps.update(lightboxContent);
}
app.hideLightbox = function() {
	d3.select("#lightbox-dimmer").style("display", "none");
	d3.select("#lightbox").style("display", "none");
}

//===== COMMANDS =====
app.commands = {};

app.commands.help = function(command) {
	if ( command == "" ) {
		var cmd_list = [];
		for ( var key in app.commands ) {
			if ( app.commands.hasOwnProperty(key) ) {
				cmd_list.push(key);
			}
		}
		app.outputLines(["Type 'help <em>cmd</em>' for more information on a specific command. Available commands:"]
			.concat(cmd_list));
	} else if ( typeof app.commands[command] == "function" ) {
		app.outputLines(app.commands[command].manual);
	} else {
		app.outputLines(["Command not found: "+escapeHtml(command)]);
	}
};
app.commands.help.manual = [
	"Usage: help [<em>command</em>]",
	"----------",
	"Prints a description of how to use <em>command</em>.",
	"Without arguments, lists all available commands."
];

app.commands.ls = function(dir_name) {
	if ( dir_name[dir_name.length-1] == "/") {
		// Trailing slashes on directory names are okay
		dir_name = dir_name.slice(0, dir_name.length-1);
	}
	if ( dir_name == "" ) {
		var item_list = [];
		for ( var i = 0; i < app.cwd.length; i++ ) {
			if ( Array.isArray(app.cwd[i].children) ) {
				item_list.push(app.cwd[i].name+"/") // The item is a directory
			} else {
				item_list.push(app.cwd[i].name);
			}
		}
		item_list.sort();
		app.outputLines(item_list);
	} else {
		var i = 0;
		for ( ; i < app.cwd.length; i++ ) {
			if ( app.cwd[i].name == dir_name && Array.isArray(app.cwd[i].children) ) {
				var dir = app.cwd[i].children;
				var item_list = [];
				for ( var j = 0; j < dir.length; j++ ) {
					if ( Array.isArray(dir[j].children) ) {
						item_list.push(dir[j].name+"/") // The item is a directory
					} else {
						item_list.push(dir[j].name);
					}
				}
				item_list.sort();
				app.outputLines(item_list);
				break;
			} else if ( app.cwd[i].name == dir_name ) {
				app.outputLines([escapeHtml(dir_name)+" is not a directory."]);
				break;
			}
		}
		if ( i == app.cwd.length ) {
			app.outputLines([escapeHtml(dir_name)+" not found."]);
		}
	}
};
app.commands.ls.manual = [
	"Usage: ls [<em>directory</em>]",
	"----------",
	"List the items in the given directory. Directories are indicated by a trailing '/'.",
	"If <em>directory</em> is not specified, lists the items in the current working directory."
]

app.commands.cd = function(dir_name) {
	if ( dir_name[dir_name.length-1] == "/") {
		// Trailing slashes on directory names are okay
		dir_name = dir_name.slice(0, dir_name.length-1);
	}
	if ( dir_name == "" ) {
		app.cwd = app.root;
		app.cwd_path = [];
		app.outputLines([]);
	} else if ( dir_name == ".." ) {
		app.cwd_path.pop();
		var path = app.cwd_path;
		app.cwd_path = [];
		app.cwd = app.root;
		for ( var i; i < path.length; i++ ) {
			app.commands.cd(path[i]);
			app.outputLines([]);
		}
		app.outputLines([]);
	} else {
		var i = 0;
		var numItems = app.cwd.length; // Need to store because entering a directory will change app.cwd
		for ( ; i < numItems; i++ ) {
			if ( app.cwd[i].name == dir_name && Array.isArray(app.cwd[i].children) ) {
				app.cwd_path.push(app.cwd[i].name);
				app.cwd = app.cwd[i].children;
				app.outputLines([]);
				break;
			} else if ( app.cwd[i].name == dir_name ) {
				app.outputLines([escapeHtml(dir_name)+" is not a directory."]);
				break;
			}
		}
		if ( i == numItems ) {
			app.outputLines([escapeHtml(dir_name)+" not found."]);
		}
	}
};
app.commands.cd.manual = [
	"Usage: cd [<em>directory</em> | ..]",
	"----------",
	"Change to the given directory.",
	"Without arguments, change to the root directory.",
	"'cd ..' changes to the parent directory."
]

app.commands.pwd = function() {
	var result = "/";
	for ( var i =0; i < app.cwd_path.length; i++ ) {
		result += app.cwd_path[i] + "/";
	}
	app.outputLines([result]);
};
app.commands.pwd.manual = [
	"Usage: pwd",
	"----------",
	"Displays the path of the current working directory."
];

app.commands.view = function(item_name) {
	if ( item_name == "" ) {
		app.outputLines(["No item to view specified."]);
	} else {
		var i = 0;
		for ( ; i < app.cwd.length; i++ ) {
			if ( app.cwd[i].name == item_name ) {
				var item  = app.cwd[i];
				if ( item.viewHTML ) {
					d3.select("#lightbox")
						.classed("document-view", false);
					d3.select("#lightbox-content")
						.html("<div>"+item.viewHTML+"</div>"); // Wrap in div for CSS margin
					app.showLightbox();
				} else if ( item.viewURL ) {
					if ( item.viewType == "doc" ) {
						d3.select("#lightbox")
							.classed("document-view", true);
						d3.select("#lightbox-content")
							.html("<iframe src=\"https://docs.google.com/gview?url="
								//+app.BASE_URL+item.viewURL
								// TODO Below is a public domain document for demo purposes
								// we cannot use the real document until we have a publicly accessible URL
								+"http://ieee802.org/secmail/docIZSEwEqHFr.doc"
								+"&embedded=true\" frameborder=\"0\"></iframe>");
						app.showLightbox();
					} else if ( item.viewType == "pdf" ) {
						d3.select("#lightbox")
							.classed("document-view", true);
						d3.select("#lightbox-content")
							.html("<iframe src=\"/ViewerJS/#../"+item.viewURL+
							"\" allowfullscreen webkitallowfullscreen></iframe>");
						app.showLightbox();
					} else if ( item.viewType = "img" ) {
						d3.select("#lightbox")
							.classed("document-view", false);
						d3.select("#lightbox-content")
							.html("<img src=\""+item.viewURL+"\"></img>");
						app.showLightbox();
					} else {
						app.outputLines([escapeHtml(item_name)+" is not viewable."]);
					}
				} else if ( Array.isArray(item.children) ) {
					app.outputLines([escapeHtml(item_name)+" is a directory. Try the 'ls' and 'cd' commands."]);
				} else {
					app.outputLines([escapeHtml(item_name)+" is not viewable."]);
				}
				break;
			}
		}
		if ( i == app.cwd.length ) {
			app.outputLines([escapeHtml(item_name)+" not found."]);
		}
	}
};
app.commands.view.manual = [
	"Usage: view <em>item</em>",
	"----------",
	"View the content of the item."
];

app.commands.download = function(item_name) {
	if ( item_name == "" ) {
		app.outputLines(["No item to download specified."]);
	} else {
		var i = 0;
		for ( ; i < app.cwd.length; i++ ) {
			if ( app.cwd[i].name == item_name && app.cwd[i].downloadURL ) {
				downloadFile(app.BASE_URL + app.cwd[i].downloadURL);
				break;
			} else if ( app.cwd[i].name == item_name ) {
				app.outputLines([escapeHtml(item_name)+" is not downloadable."]);
				break;
			}
		}
		if ( i == app.cwd.length ) {
			app.outputLines([escapeHtml(item_name)+" not found."]);
		}
	}
};
app.commands.download.manual = [
	"Usage: download <em>item</em>",
	"----------",
	"Download the given item."
];

app.commands.contact = function() {
	d3.select("#lightbox")
		.classed("document-view", false);
	d3.select("#lightbox-content")
		.html("<div>"+app.root[1].viewHTML+"</div>"); // !! Make sure Contact is item 2 !!
	app.showLightbox();
};
app.commands.contact.manual = [
	"Usage: contact",
	"----------",
	"Display contact information."
]

//===== Data =====
app.root = [
	{
		name: "Summary",
		viewHTML: "Hello! :)"
				+"<p>I'm a software developer with one year of industry experience. "
				+"I spent the last year taking classes towards a PhD in Informatics at University of California, Irvine.</p>"
				+"<p>Now I am returning to industry and am looking for software engineering positions in San Diego, CA. "
				+"I have strong experience in Java, Python, and full-stack web development including REST API specification and integration.</p>"
	},
	{
		name: "Contact",
		viewHTML: "<p><strong>Call/Text</strong> 4 0 7 - 2 0 5 - 9 5 9 7</p>"
				+"<p><strong>Email</strong> <a href='mailto:jordan.rickman.42@gmail.com'>jordan.rickman.42@gmail.com</a></p>"
				+"<p><strong>LinkedIn</strong> <a href='http://linkedin.com/in/jordanrickman' target='_blank'>http://linkedin.com/in/jordanrickman</a></p>"
	},
	{
		name: "Resume.pdf",
		viewType: "pdf",
		viewURL: "files/Resume.pdf",
		downloadURL: "files/Resume.pdf"
	},
	{
		name: "Resume.docx",
		viewType: "doc",
		viewURL: "files/Resume.docx",
		downloadURL: "files/Resume.docx"
	},
	{
		name: "Portrait.jpg",
		viewType: "img",
		viewURL: "files/Portrait.jpg",
		downloadURL: "files/Portrait.jpg"
	},
	{
		name: "Skills",
		children: [
			{
				name: "Java",
				viewHTML: "<p class='skills-list-header'>Java Experience:</p>"
						+"<ul class='skills-list'>"
							+"<li>server-side</li>"
							+"<li>REST APIs</li>"
							+"<li>SQL and NoSQL</li>"
							+"<li>Android</li></ul>"
						+"<p>I have the most experience with Java, all the way back to classes in undergrad. "
						+"I enjoy its combination of clean, type-safe object-oriented programming and advanced modern language features.</p>"
						+"<p>At AAA National, I worked with server-side Java development on the JBoss platform. "
						+"First, I performed full-stack feature development for a web application, including queries to an Oracle SQL database. "
						+"Later, I developed REST APIs in Java for integration with our business partners. "
						+"For these APIs, I integrated with a MongoDB database.</p>"
						+"<p>At TravelClick, I continued to refine my skills in back-end Java. "
						+"I developed new features for an enterprise service bus system. "
						+"One such feature was logging to ElasticSearch, giving me further experience with NoSQL databases.</p>"
						+"<p>I also have some experience with the Android SDK. While a student researcher at UCLA, "
						+"I helped to modify an Android application. In particular, I was responsible for fixing performance issues "
						+"by transitioning a key component from single- to multi-threaded.</p>"
			},
			{
				name: "Python",
				viewHTML: "<p class='skills-list-header'>Python Experience:</p>"
						+"<ul class='skills-list'>"
							+"<li>JSON REST APIs</li>"
							+"<li>scripting / automation</li></ul>"
						+"<p>My favorite language to work in is Python, due to its flexibility and expressive power. "
						+"While a student researcher at UCLA, I used Python - with the SciPy library - "
						+"to write a toolchain for automatically processing our data. "
						+"Python is also my go-to language for quick scripts to customize my computer or manage personal files.</p>"
						+"<p>More recently, I used Python for an e-literature project at UC Irvine called Geo-Poetry. "
						+"I built a Python server from scratch using the Flask microframework. "
						+"The server exposed a JSON REST API and integrated with third-party APIs, namely Twitter and Spotify.</p>"
			},
			{
				name: "Web Frontend",
				viewHTML: "<p class='skills-list-header'>Web Frontend Experience:</p>"
						+"<ul class='skills-list'>"
							+"<li>HTML, CSS</li>"
							+"<li>jQuery</li>"
							+"<li>AngularJS</li>"
							+"<li>d3</li></ul>"
						+"<p>I am a versatile front-end web developer. "
						+"At AAA National, I developed features and fixes for a jQuery-based web GUI. "
						+"At TravelClick, I built a single-page frontend in AngularJS for the (open-source) Wiremock server. "
						+"I was tasked with creating a mock endpoint for our QA team to use during integration testing. "
						+"I took the initiative to build this general-purpose tool, allowing our QA team to spin up whatever mock endpoints they needed, "
						+"without having to call on our developers to write code for them.</p>"
						+"<p>While a PhD student at UC Irvine, I built another single-page application in Angular, "
						+"as part of an e-literature project called Geo-Poetry. The application connected to a JSON REST API that I developed in Python.</p>"
						+"Finally, I developed <em>this</em> website from scratch using the d3 framework.</p>"
			},
			{
				name: "Databases",
				viewHTML: "<p class='skills-list-header'>Database Experience:</p>"
						+"<ul class='skills-list'>"
							+"<li>SQL</li>"
							+"<li>MongoDB</li>"
							+"<li>ElasticSearch</li></ul>"
						+"<p>I have worked with both SQL and NoSQL databases. "
						+"At AAA National, I created tables and wrote queries for an Oracle SQL database. "
						+"Later, while developing JSON REST APIs for AAA, I worked with a MongoDB database. "
						+"At TravelClick, I configured and wrote queries for an ElasticSearch database, "
						+"as part of rewriting our logging system.</p>"
			},
			{
				name: "Linux",
				viewHTML: "<p>I am familiar with Linux/UNIX systems, and comfortable with the command line. "
						+"I worked with Linux deployment environments at both AAA National and TravelClick. "
						+"Additionally, I have used Bash shell scripts for customizing my personal computers and automatically backing up my files.</p>"
			}
		]
	},
	{
		name: "Experience",
		children: [
			{
				name: "AAA National",
				viewHTML: "<p class='job-header-left'><em>AAA National Office</em><br /><strong>Programmer Analyst</strong></p>"
						+"<p class='job-header-right'>Lake Mary, FL<br />Sept 2014 - Apr 2015</p>"
						+"<ul class='skills-list'>"
							+"<li>full-stack web development</li>"
							+"<li>Java</li>"
							+"<li>jQuery</li>"
							+"<li>REST API development</li>"
							+"<li>SQL</li>"
							+"<li>MongoDB</li></ul>"
						+"<p>I worked on two different teams during my time at AAA National. "
						+"First, I was part of a team maintaining and improving a web application for AAA's roadside assistance program. "
						+"This was full-stack web development - jQuery frontend, Java backend using the JBoss server, and an Oracle SQL database.</p>"
						+"<p>Second, I worked on a team developing REST APIs for integrating with our business partners. "
						+"A critical part of this work was transforming data between differing API specifications, and validating incoming data. "
						+"We used a MongoDB database to log data and to store state between requests.</p>"
			},
			{
				name: "TravelClick",
				viewHTML: "<p class='job-header-left'><em>TravelClick, Inc.</em><br /><strong>Software Engineer</strong></p>"
						+"<p class='job-header-right'>Orlando, FL<br />Apr 2015 - Sept 2015</p>"
						+"<ul class='skills-list'>"
							+"<li>Java</li>"
							+"<li>enterprise service bus</li>"
							+"<li>ElasticSearch</li>"
							+"<li>AngularJS</li></ul>"
						+"<p>At TravelClick, I worked on a team transitioning legacy software to a Java enterprise service bus architecture. "
						+"While the senior developers split their time between maintaining the legacy system and developing for the new system, "
						+"I worked entirely on feature development for the new system. "
						+"This was Java back-end work in an Apache Camel enterprise service bus environment. "
						+"One of my significant contributions was developing our new logging system, which used the ElasticSearch NoSQL database.</p>"
						+"<p>One project at TravelClick involved front-end development, and demonstrated my initiative in optimizing our business process. "
						+"I was tasked with creating a mock endpoint for our QA team to connect to during integration testing. "
						+"Realizing that this was a generalizable problem, I proposed a frontend to the open-source Wiremock mocking server. "
						+"I developed this tool as a single-page web application using AngularJS. "
						+"It allowed our QA team to spin up any mock endpoints they needed, without calling on the developers.</p>"
			},
			{
				name: "UCLA WHI",
				viewHTML: "<p class='job-header-left'><em>UCLA Wireless Health Institute</em><br /><strong>Student Researcher</strong></p>"
						+"<p class='job-header-right'>Los Angeles, CA<br />June 2013 - Aug 2013</p>"
						+"<ul class='skills-list'>"
							+"<li>Python</li>"
							+"<li>Android</li>"
							+"<li>machine learning</li></ul>"
						+"<p>As an undergraduate, I was selected for a competitive research internship at UCLA's Wireless Health Institute. "
						+"I worked on a team of two, under the supervision of computer science PhD students, "
						+"on a research project using supervised machine learning to detect exercise activity from phone accelerometer data. "
						+"I was responsible for automating our data-processing toolchain using Python. "
						+"I also helped implement our results in an Android app. "
						+"I made significant improvements to the app's responsiveness by converting single-threaded components to multi-threaded.</p>"
			}
		]
	},
	{
		name: "Education",
		children: [
			{
				name: "Rollins College",
				viewHTML: "<p class='job-header-left'><em>Rollins College</em><br /><strong>B.A. in Mathematics, C.S. Minor</strong></p>"
						+"<p class='job-header-right'>Winter Park, FL<br />Aug 2010 - May 2014</p>"
						+"<p>I earned my bachelor's degree at Rollins College, where I concentrated in theoretical computer science and discrete math, "
						+"with coursework in formal logic, graph theory, formal languages, and automata. "
						+"I was awarded a full-ride merit scholarship and completed an interdisciplinary honors program. "
						+"For the honors program, I completed a thesis project entitled <em>Artificial Intelligence and Course Timetabling</em>, "
						+"which I describe in more detail in the 'Projects' section and which I presented at an international conference.</p>"
			},
			{
				name: "UC Irvine",
				viewHTML: "<p class='job-header-left'><em>University of California, Irvine</em><br /><strong>PhD Software Engineering</strong> (incomplete)</p>"
						+"<p class='job-header-right'>Irvine, CA<br />Sept 2015 - June 2016</p>"
						+"<p>In September 2015, I began a PhD in Software Engineering at UC Irvine's Department of Informatics. "
						+"However, I have decided not to pursue a PhD at this time, and am returning to industry work. "
						+"During my time at UC Irvine, I completed coursework in software architecture and human-computer interaction, "
						+"as well as an e-literature project entitled <em>Geo-Poetry</em>, which I describe in more detail in the 'Projects' section.</p>"
			}
		]
	},
	{
		name: "Projects",
		children: [
			{
				name: "Geo-Poetry",
				viewHTML: "<p class='job-header-left'><strong>Geo-Poetry</strong></p>"
						+"<p class='job-header-right'>University of California, Irvine</p>"
						+"<ul class='skills-list'>"
							+"<li>JSON REST API development</li>"
							+"<li>third-party API integration</li>"
							+"<li>Python</li>"
							+"<li>AngularJS</li></ul>"
						+"<p>For an e-Literature research project at UC Irvine, I developed a JSON REST API in Python using the Flask microframework, "
						+"and a web frontend using AngularJS. The system connects to the Twitter API in order to fetch tweets around "
						+"a given GPS location, which are scrambled to form computer-generated 'poetry' and used to select mood music "
						+"from the Spotify API based on sentiment analysis. "
						+"All the code is available open-source at <a href='https://github.com/UCI-TPL' target='_blank'>https://github.com/UCI-TPL</a>, "
						+"and a paper based on the project will be published via the 2016 International Conference on Interactive Digital Storytelling.</p>"
			},
			{
				name: "AI and Course Timetabling",
				viewHTML: "<p class='job-header-left'><strong>Artificial  Intelligence and Course Timetabling</strong></p>"
						+"<p class='job-header-right'>Rollins College</p>"
						+"<ul class='skills-list'>"
							+"<li>Java</li>"
							+"<li>data structures</li>"
							+"<li>graph theory</li>"
							+"<li>search (AI)</li>"
							+"<li>genetic machine learning</li></ul>"
						+"<p>For my undergraduate honors thesis, I developed a novel algorithm using graph-coloring heuristics to solve timetabling problems. "
						+"I modified a Java desktop application to use the new algorithm. I managed all stages of the software development "
						+"lifecycle using a test-driven methodology. To reduce memory usage, I completely redesigned the application's "
						+"data structures and added copy-on-write caching. Lastly, I enhanced the algorithm by using genetic machine learning to select heuristics. "
						+"I presented the work at the 2014 International Conference on the Practice and Theory of Automated Timetabling.</p>"
			}
		]
	}
];

app.cwd = app.root;
app.cwd_path = [];

//===== Initialize - called on page load =====
app.init = function() {
	// ESC key closes lightbox
	document.addEventListener('keydown', function(evt) {
		evt = evt || window.event;
		if ( evt.keyCode == 27 ) {
			app.hideLightbox();
		}
	});

	// Tab completion
	document.getElementById('input').onkeydown = function(evt) {
		evt = evt || window.event;
		if ( evt.keyCode == 9 ) {
			var input_text = d3.select("#input").node().value;
			var text_words = input_text.split(" ");
			var command = text_words[0];
			var name_to_complete = text_words.slice(1).join(" ");
			if ( command != "" && name_to_complete != "" ) {
				for ( var i = 0; i < app.cwd.length; i++ ) {
					var item_name = app.cwd[i].name;
					if ( item_name.indexOf(name_to_complete) == 0 ) {
						var completion = command + " " + item_name;
						d3.select("#input").property("value", completion);
						break;
					}
				}
			}
			return false; // Don't tab out of the input box - don't propagate the event.
		}
		return true; // Propagate other keydown events
	};

	// Focus the command input
	document.getElementById('input').focus();

	// Initialize PerfectScrollbar
	var consoleOutput = document.getElementById('output-lines');
	Ps.initialize(consoleOutput);
	var lightboxContent = document.getElementById('lightbox-content');
	Ps.initialize(lightboxContent);
	// Update PerfectScrollbar when viewport changes size
	window.addEventListener('resize', function(evt) {
		Ps.update(consoleOutput);
		Ps.update(lightboxContent);
	});

	// TODO URL Breadcrumbs
}
