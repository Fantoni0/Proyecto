//Auxiliar functions
module.exports={

errorBinding: function(err, msg){
    if(err){
        console.log("Error binding "+msg+ " socket.");
    }else{console.log("Socket "+msg+" is up and ready");}
},

getShop: function(){
	var shop = [
	{
		ref_number:1,
		name: "Iron Pan" ,
		quantity:6,
		price: 15.68
	},
	{
		ref_number:2,
		name: "Blue skirt",
		quantity:5,
		price: 23.85
	},
	{
		ref_number:3,
		name: "Sugar",
		quantity:53,
		price: 1.23
	},
	{
		ref_number:4,
		name: "Cookies",
		quantity:73,
		price: 1.01
	},
	{
		ref_number:5,
		name: "Batman Stickers",
		quantity:11,
		price: 2.84
	},
	];
	return shop;
},

randomRequest : function(id,refNum){
	var request, kind, prop;
	var query = ['get','getAll','buy','return'];
	kind = query[this.randInteger(query.length-1,0)];
	if(kind == 'get'){
		request = {
			clientId: id,
			kind: kind,
			ref_number: refNum
		};
	}else if(kind == 'getAll'){
		request = {
			clientId: id,
			kind: kind
		};
	}else if(kind == 'buy'){
		request = {
			clientId: id,
			kind: kind,
			ref_number: refNum,
			quantity: this.randInteger(20,2)
		};
	}else if(kind == 'return'){
		request = {
			clientId: id,
			kind: kind,
			ref_number: refNum,
			quantity: this.randInteger(20,2)
		};
	}else{
		console.log("Invalid request");
		process.exit(0);
	}
	return JSON.stringify(request);
},

randInteger :function(upper,lower){
	var num = Math.abs(Math.round(Math.random()*upper));
	return num +(lower || 0);
},
randReal : function(upper,lower){
	var num = Math.abs(Math.random()*upper);
	return num +(lower || 0);
},

randString : function(){
	var len = 5
	, charSet = 'abcdefghijklmnopqrstuvvwxyz'
	, result = [];
	for (var i = 0; i < len; ++i) {
		result.push(charSet[Math.floor(Math.random() * charSet.length)]);
	}
	//result.splice(len / 2, 0, ['-']);
	return result.join('');
}
};