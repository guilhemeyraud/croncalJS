# croncalJS

## Description
croncalJS is a JavaScript version of croncal https://github.com/waldner/croncal.
it's an utility to convert a crontab file to a list of actual events within a unix timestamp range.


## Usage
Instantiate an object with : ( cronFile is the actual crontab, you can get it with crontab -l )
```  
new croncalJS(cronFile);   
```
Generate the calendar :
```  
var calendar = ccJS.genCalendar(1484092914,1494347114);  
```
Then you'll have an object containing every job sorted in imbricated array.
each jobs array is in minute array,
each minute array is in hour array,
each hour array is in day array,
each day array is in month array,
and finaly each month array is in year array.

so if you want the the job for the 14/07/1789 at 14:00 => 
```
calendar[1789][7][14][14][0]
```


## Example
```
cronFile="*/1 * * * * doSomeSh*t > /dev/null 2>&1\n*/5 * * * * doMoreSh*t > /dev/null 2>&1\n#*/5 * * * * f*ckShitAgain! > /dev/null 2>&1\n00,10,20,30,40,50 * * * * doALotsOfSh*ts > /dev/null 2>&1";
var ccJS = new croncalJS(cronFile);
var calendar = ccJS.genCalendar(1484092914,1494347114);
console.log(calendar);
```
