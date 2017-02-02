/* croncalJS
*/


module.exports = croncalJS;// for use in browser just remove this line 


function croncalJS(crontabString){
	this.monthmap = [ 'january|jan', 'february|feb', 'march|mar', 'april|apr', 'may', 'june|jun', 'july|jul', 'august|aug', 'september|sep', 'october|oct', 'november|nov', 'december|dec' ];
	this.dowmap = [ 'sunday|sun', 'monday|mon', 'tuesday|tue', 'wednesday|wed', 'thursday|thu', 'friday|fri', 'saturday|sat' ];
	this.crontabList = crontabString.split("\n");
	
	this.type = ["min", "hour", "dom", "month", "dow"];
	
	this.joblist = [];
	
	this.calendar = {};
	this.jobListByMinute=[];
	
	this.__generateJobList();
}

croncalJS.prototype.setCrontab = function(crontabString){
	this.crontabList = crontabString.split("\n");
	this.__generateJobList();
}

croncalJS.prototype.__generateJobList = function(){
	var self=this;
	
	for(var i=0, len=self.crontabList.length; i<len;i++){
		
		line=self.crontabList[i];
		// remove leading/trailing spaces
		line = line.replace(/(^\s+)|(\s+$)/,"");

		// skip comments and emtpy lines
		if( line.match(/^($|#)/) || line.match(/^\s*\S+\s*=\s*/) ){
			continue; 
		}
			
		var raw = {};
		var parsed = {};

		// we must have either:
		// - one field beginning with @ + command
		// - five fields + command
		var ret = line.match(/^(@(reboot|yearly|annually|monthly|weekly|daily|hourly))\s+(.*)/i)
		if (  ret!=null ){

			var type = ret[2];
			parsed["sched_orig"] = ret[1];

			if (type == 'yearly' || type == 'annually') {
				raw = {'min':'0', 'hour':'0', 'dom':'1', 'month':'1', 'dow':'*', 'command':ret[3]};
			} else if (type == 'monthly') {
				raw = {'min':'0', 'hour':'0', 'dom':'1', 'month':'*', 'dow':'*', 'command':ret[3]};
			} else if (type == 'weekly') {
				raw = {'min':'0', 'hour':'0', 'dom':'*', 'month':'*', 'dow':'0', 'command':ret[3]};
			} else if (type == 'daily') {
				raw = {'min':'0', 'hour':'0', 'dom':'*', 'month':'*', 'dow':'*', 'command':ret[3]};
			} else if (type == 'hourly') {
				raw = {'min':'0', 'hour':'*', 'dom':'*', 'month':'*', 'dow':'*', 'command':ret[3]};
			} else if (type == 'reboot') {
				console.log("Warning, skipping \@reboot entry at line "+i+": "+line+"\n");
				continue;
			} else {
				console.log( "Unknown line/cannot happen at line "+i+", skipping: "+line+"\n");
				continue;
			}

		} else {
			var ret = line.match(/^((\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+))\s+(.*)/)
			if ( ret!=null ) {
				parsed["sched_orig"] = ret[1];
				// regular entry
				raw = {'min':ret[2], 'hour':ret[3], 'dom':ret[4], 'month':ret[5], 'dow':ret[6], 'command':ret[7]};
			} else {
				console.log( "Warning, skipping unrecognized crontab line "+i+": "+line+"\n");
				continue;
			}
		}
		
		
		var success = 1;
		
		// if all fields parse OK, save the entry, otherwise skip it
		for(var j=0, len2=self.type.length; j<len2; j++){
			type=self.type[j];
			var result=self.__parse(raw[type], type);
			;
			if (typeof result == 'string' ) {
				console.log("Parsing line "+j+": "+result+", skipping line");
				success = 0;
				break;
			}

			// silly way to create a hash and remove duplicates
			parsed[type] = {};
			for( var l=0, len3=result.length;l<len3;l++)
				parsed[type][result[l]]='';

			// save original field value
			parsed[type+"_orig"] = raw[type];
		}
		if (success) {
			// save the parsed entry
			parsed['command'] = raw['command'];
			self.joblist.push(parsed);
		}
	}
}

croncalJS.prototype.genCalendar = function(startSec,endSec,optional_returnType){
	var self=this;
	
	this.calendar = {};
	this.jobListByMinute=[];
	
	
	var minute = (endsec-startSec)/60;
	var jobListByMinute=[];
	for(var i=0, i<minute ;i++){
		jobListByMinute[i]=[];
	}
	
	nbMinute=0;
	for (var second = startSec; second < endSec; second += 60) {
		var date = new Date(second*1000);
		var y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate(),h=date.getHours(), mi=date.getMinutes(),dow=date.getDay();
		for(var i=0, len=self.joblist.length; i<len; i++){
			if (self.__isdue(d, m, y, dow, h, mi, self.joblist[i])) {
				if( typeof self.calendar[y] == 'undefined' ) self.calendar[y] = [];
				if( typeof self.calendar[y][m] == 'undefined' ) self.calendar[y][m] = [];
				if( typeof self.calendar[y][m][d] == 'undefined' ) self.calendar[y][m][d] = [];
				if( typeof self.calendar[y][m][d][h] == 'undefined' ) self.calendar[y][m][d][h] = [];
				if( typeof self.calendar[y][m][d][h][mi]== 'undefined' ) self.calendar[y][m][d][h][mi] = [];
				
				self.calendar[y][m][d][h][mi].push(self.joblist[i]["command"]);
				self.jobListByMinute[nbMinute].push(self.joblist[i]["command"]);
				
			}
		}
		nbMinute++;
	}
	
	if( typeof returnType != 'string' or returnType == "calendar" )
		return self.calendar;
	else if( returnType == "jobListByMinute" )
		return self.jobListByMinute;
	else
		return self.calendar;
}

croncalJS.prototype.getJobListByMinute = function(){
	return this.jobListByMinute;
}
croncalJS.prototype.getCalendar = function(){
	return this.calendar;
}



croncalJS.prototype.__parse = function(field,type){
	var self = this;
	var min, max, desc;

	if (type == 'min') {
		min=0; max=59; desc='minutes';
	} else if (type == 'hour') {
		min=0; max=23; desc=type;
	} else if (type == 'dom') {
		min=1; max=31; desc='day of month';
	} else if (type == 'month') {
		min=1; max=12; desc=type;
	} else if (type == 'dow') {
		min=0; max=6; desc='day of week';  //0 or 7 is sunday, 7 is silently converted to 0
	} else {
		return "field - "+field+" - of (unrecognized) type type: cannot happen!";
	}

	// expand stars
	field = field.replace("*",min+"-"+max);

	// replace dow and month names with numbers
	if (type == 'month') {
		for( var i=0, len = self.monthmap.length;i<len;i++){
			field = field.replace( new RegExp(self.monthmap[i],"gi"),i);
		}
	} else if (type == 'dow') {
		for( var i=0, len = self.dowmap.length;i<len;i++){
			field = field.replace( new RegExp(self.dowmap[i],"gi"),i);
		}
	}


  
	var items = field.split(/,/);
	
	var values = [];

	for( var i=0, len=items.length;i<len;i++){
		
		if( items[i].match(/^\d+$/) ){
			
			// single number
			if (type == 'dow' && items[i] == '7') {
				items[i] = '0';
			}
			
			if (items[i] >= min && items[i] <= max) {
				// remove leading zeros (but leave a single 0 if there's nothing else)
				items[i]=items[i].replace(/^0+(\d)/,"$1");
				values.push(items[i]);
				continue;
			} else {
				return "invalid value "+items[i]+" for field - "+field+" - of type "+type;
			}

		  
		}

		var step;

		// see if there is a step, save and remove it
		var ret = items[i].match(/\/(\d+)$/);
		if (ret != null) {
			step = ret[1];
			step=parseInt(step.replace(/^0+(\d)/,"$1"));
			if (step == 0) {
				return "step cannot be zero for field - "+field+" - of type "+type;
			}
			items[i] = items[i].replace(/\/(\d+)$/,"");
			items[i] = items[i].replace(/^0+(\d)/,"$1");

		} else if (items[i].match("/")) {
			return "unrecognized step format for field - "+field+" - of type "+type;
		} else {
			step = 1;
		}
		if (step > (max - min)) {
			return "too big step value "+step+" for field - "+field+" - of type "+type;
		}

		// now, expand the range...
		
		// ...because it's a range, right?
		var range = items[i].match(/^(\d+)-(\d+)$/);
		if ( items[i].match(/^(\d+)-(\d+)$/) ) {
			var from = range[1];
			var to = range[2];

			from = parseInt(from.replace(/^0+(\d)/,"$1"));
			to = parseInt(to.replace(/^0+(\d)/,"$1"));

			if (from > to) {
				return "start value $from greater than end value $to for field - "+field+" - of type "+type;
			}

			for (var i = from; i <= to; i += step) {
				values.push(i);
			}

		} else {
			return "invalid range/not a range for field - "+field+" - of type "+type;
		}

	}

  return values;
}

// given a crontab entry and a date, returns true
// if the task has to be executed
croncalJS.prototype.__isdue = function(day, month, year, dow, hour, min, parsed){

	// we have to run if:

	// min is included in the min list
	// AND
	// hour is included in the hour list  
	// AND
	// silly dom/dow logic is true
	// AND
	// month is included in the month list

	// yes, if one used 1-31, or 1-6,7-31 or 0-6 or whatever, it's not the
	// same as specifying a real star. It's easy to enhance the code to
	// include those cases, though.

	var stardom = parsed['dom_orig'] == '*';
	var stardow = parsed['dow_orig'] == '*';

	return (	
		typeof parsed["min"][min] != 'undefined' &&
		typeof parsed["hour"][hour] != 'undefined' &&
		typeof parsed["month"][month] != 'undefined' &&

		// silly dom/dow logic

		( (stardom && stardow) ||
		(! stardom && ! stardow && ( typeof parsed["dom"][day] != 'undefined' || typeof parsed["dow"][dow] != 'undefined')) ||
		(! stardom && typeof parsed["dom"][day] != 'undefined') ||
		(! stardow && typeof parsed["dow"][dow] != 'undefined') ));

}


/*******  EXAMPLE :  *******/
//cronFile="*/1 * * * * /usr/local/sysusage/bin/sysusage > /dev/null 2>&1\n*/5 * * * * /usr/bin/nice -19 /usr/local/sysusage/bin/sysusagejqgraph > /dev/null 2>&1\n#*/5 * * * * /usr/bin/nice -19 /usr/local/sysusage/bin/sysusagegraph > /dev/null 2>&1\n00,10,20,30,40,50 * * * * /var/www/html/sargraph/scripts/getsar.sh > /dev/null 2>&1";
//var cron = new croncalJS(cronFile);
//ret = cron.genCalendar(1484092914,1494347114);
//console.log(ret);
