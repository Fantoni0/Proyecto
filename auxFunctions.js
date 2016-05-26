//Auxiliar functions

var errorBinding = function(err, msg){
    if(err){
        console.log("Error binding "+msg+ " socket.");
    }else{console.log("Socket "+msg+" is up and ready");}
};

var getShop = function(){
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
};

var randomRequest = function(id){
	var request, kind, prop;
	var shopLength = getShop().length-1;
	var query = ['get','update','create','delete'];
	var property = ['name','quantity','price'];
	kind = query[randInteger(query.length-1,0)];
	if(kind == 'get'){
		request = {
			clientId: id,
			kind: kind,
			ref_number: randInteger(shopLength,0)
		};
	}else if(kind == 'update'){
		var aux;
		prop = property[randInteger(property.length-1,0)];
		if(prop =='name') aux = randString();
		if(prop =='quantity') aux = randInteger(10,1);
		if(prop =='price') aux = randReal(5,1);
		request = {
			clientId: id,
			kind: kind,
			ref_number: randInteger(shopLength,0),
			property: prop,
			value: aux
		};
	}else if(kind == 'create'){
		request = {
			clientId: id,
			kind: kind,
			ref_number: shopLength+1,
			name: randString(),
			quantity: randInteger(20,5),
			price: randReal(15,5)
		};
	}else if(kind == 'delete'){
		request = {
			clientId: id,
			kind: kind,
			ref_number: randInteger(shopLength,0)
		};
	}else{
		console.log("Invalid request");
		process.exit(0);
	}
	return JSON.stringify(request);
};

var randInteger = function(upper,lower){
	var num = Math.abs(Math.round(Math.random()*upper));
	return num +(lower || 0);
};

var randReal = function(upper,lower){
	var num = Math.abs(Math.random()*upper);
	return num +(lower || 0);
};

var randString = function(){
	var len = 5
	, charSet = 'abcdefghijklmnopqrstuvvwxyz'
	, result = [];
	for (var i = 0; i < len; ++i) {
		result.push(charSet[Math.floor(Math.random() * charSet.length)]);
	}
	//result.splice(len / 2, 0, ['-']);
	return result.join('');
};