var app = {};

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
};

//TODO Use d3 transitions to fade in/out
app.showLightbox = function() {
	d3.select("#lightbox-dimmer").style("display", "block");
	d3.select("#lightbox").style("display", "block");
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
		app.outputLines(cmd_list);
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

app.commands.view = function() {

};

//===== Data =====
app.root = [
	{
		name: "Resume.pdf"
	},
	{
		name: "Resume.docx"
	},
	{
		name: "Portrait.jpg"
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
	}
];

app.cwd = app.root;
app.cwd_path = [];

//===== Initialize DOM =====
