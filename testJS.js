
//Si esto funcionara como queremos deberia imprimir la cuenta de 1 a 20, después de -1 a -20
// y finalmente las 20 primeras letras del alfabeto. Pero no es así, ejecutalo y lo verás.
 var anticuenta = function(){
 	for(i=1;i<=3;i++){
 		console.log(-i);
 	}
 }

 var cuenta = function(){
 	for(i=1;i<=3;i++){
 		console.log(i);
 	}
 	setTimeout(anticuenta,2000); 	
 }

 var letras = function(){
 	var charSet = 'abcdefghijklmnopqrstuvvwxyz'
 	for(i=0;i<=3;i++){
 		console.log(charSet[i]);
 	}
 }

 cuenta();
 letras();