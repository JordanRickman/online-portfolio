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
	// TODO General version
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
	//Ps.update(lightboxContent);
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
			} else if ( app.cwd[i] == dir_name ) {
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
		for ( ; i < app.cwd.length; i++ ) {
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
		if ( i == app.cwd.length ) {
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

//===== Data =====
app.root = [
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
				name: "Java"
			},
			{
				name: "Python"
			}
		]
	},
	{
		name: "Summary",
		viewHTML: "Here is some view content. <em>HTML works!</em><p>Let's</p><p>make</p><p>this</p><p>much</p><p>taller.</p>"
	}
];

app.cwd = app.root;
app.cwd_path = [];

//===== Initialize - called on page load =====
app.init = function() {
	document.addEventListener('keydown', function(evt) {
		evt = evt || window.event;
		if (evt.keyCode == 27) { // ESC key
			app.hideLightbox();
		}
	});

	// Focus the command input
	document.getElementById('input').focus();

	// Initialize PerfectScrollbar
	var consoleOutput = document.getElementById('output-lines');
	Ps.initialize(consoleOutput);
	var lightboxContent = document.getElementById('lightbox-content');
	//Ps.initialize(lightboxContent);
	// Update PerfectScrollbar when viewport changes size
	window.addEventListener('resize', function(evt) {
		Ps.update(consoleOutput);
		//Ps.update(lightboxContent);
	});
}


// TODO URL Breadcrumbs
