var width = 960,
	rowHeight = 40;


function updateChromosomeCount(chr_data) {

	var chr_data = d3.csv.parse(d3.select("#csv").text());

	chr_data.forEach(function(datum){
		datum.chr = parseInt(datum.chr.replace(/,/,"").replace("-",""));
	});

	var chromosomes = d3.select("#chromosome-count")
		.selectAll("svg")
		.data(chr_data);

	var extent = d3.extent(chr_data, function(d){
		return d.chr;
	});

	var xScale = d3.scale.linear().domain([extent[0],extent[1]]).range([0,width]);

	var organism_row = chromosomes
		.enter()
		.append("svg")
			.attr("height",rowHeight)
			.attr("width", width);

	var bar = organism_row.
		append("rect")
		.attr("y", 20)
		.attr("height",20)
		.on('mouseover',function(d){
			d3.select(this).style("fill","black");
		})
		.on('mouseout',function(d){
			d3.select(this).style("fill","red");
		})
		.attr("width", function(d){
			return 0;
		})
		.transition(10000)
		.attr("width", function(d){
			return xScale(d.chr);
		});
		

	organism_row.
		append("text")
		.attr("y",15)
		.text(function(d){
			return d["Organism"];
		});
}

var chr_data = d3.csv.parse(d3.select("#csv").text());

updateChromosomeCount(chr_data);