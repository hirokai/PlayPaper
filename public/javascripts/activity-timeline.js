// timeline.js

var Timeline = Backbone.Model.extend({
	defaults: function () {
		var current = new Date();
		var from = new Date(current-1000*60*60*24*30);
		var to = current;
		return { from: from, to: to, loaded: false,
			fromTruncated: new Date(mkDateStr(from)),
			toTruncated: new Date(mkDateStr(to)),
			unit: "day"};
	},
	setData: function(papers){
		var current = new Date();
		var oldest = new Date("1980-01-01");
		var dates = _.map(papers,function(d){
			var date = new Date(d.addedDate);
			return (date >= oldest ? new Date(date) : current);
		});
		var vmin = _.min(dates);
		var vmax = _.max(dates);
		console.log(vmin,vmax);
		this.set({from: vmin,to:vmax,loaded: true});
	}
});

app.TimelineView = Backbone.View.extend({
	el: $("#content-timeline"),
	initialize: function() {
		this.mkTimeline();
		this.listenTo(commonFilter, 'change', this.loadData);
	},
	tFrom: undefined,
	tTo: undefined,
	width: 800,
	height: 200,
	svg: undefined,
	bars: undefined,
	removeAll: function(){

	},
	mkTimeline: function() {
		this.svg = d3.select('#timeline-graph')
			.append('svg')
			.attr('width',this.width)
			.attr('height',this.height)
			.style('background','#eeeeee');

		var rect = this.svg.append('rect')
			.attr('x',10)
			.attr('y',10)
			.attr('width',this.width-20)
			.attr('height',this.height-20)
			.style('fill','#cccccc');

		this.tFrom = this.svg.append('text')
			.attr('x',20)
			.attr('y',this.height-20)
			.attr('text-anchor','start')
			.text("");

		this.tTo = this.svg.append('text')
			.attr('x',this.width-20)
			.attr('y',this.height-20)
			.attr('text-anchor','end')
			.text("");
	},
	loadData: function() {
		this.svg.selectAll('rect.bars').remove();
/*		if(this.bars){
			this.bars
			.transition()
			.duration(300)
			.style('fill-opacity',0)
			.remove();				
		}*/
		var from = commonFilter.get('from');
		var to = commonFilter.get('to');
		this.tFrom.text(formatDate(from));
		this.tTo.text(formatDate(to));

		var ybase = this.height - 50;
		this.svg.append('line')
			.attr('x1',20)
			.attr('y1',ybase)
			.attr('x2',this.width-20)
			.attr('y2',ybase)
			.attr('stroke','black')
			.attr('stroke-width',1);
		
		var vals = _.map(journalstat.calendar,function(d){return (new Date(d.date) >= from) ? d.count : 0;});
		var bar_height_factor = (this.height-80)/_.max(vals);
		var bar_width = (this.width-60)/((to-from)/((1000*60*60*24)));
		this.bars = this.svg
			.selectAll('rect.bars')
			.data(journalstat.calendar)
			.enter()
			.append('rect')
			.attr('class','bars')
			.attr('x',function(d,i){return ((new Date(d.date)-from)/(1000*60*60*24))*bar_width+30})
			.attr('y',function(d){return ybase-bar_height_factor*d.count;})
			.attr('width',bar_width*0.9)
			.attr('height',function(d){return bar_height_factor*d.count;})
			.attr('fill','#4444ff');
	}
});

var timeline = new Timeline();

