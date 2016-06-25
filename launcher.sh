
node domainName.js 127.0.0.1 5005 &
sleep 1
node updateManager.js 127.0.0.1 5000 127.0.0.1 5001 127.0.0.1 5005 &
echo "Belonging Layer launched"
sleep 1
number=1
while [ $number -lt 6 ]; do
	node server.js Prueba 127.0.0.1 $((6000+number)) 127.0.0.1 5000 127.0.0.1 $((6020+number)) &
	number=$((number+1))
	sleep 1
done
sleep 1
number=1
while [ $number -lt 3 ]; do
	node client.js $number Prueba 127.0.0.1 5005 &
	echo "Client $number launched" 
	number=$((number+1))
done

sleep 1
node administrator.js Admin1 Prueba 127.0.0.1 5005 & 
sleep 1
node administrator.js Admin2 Prueba 127.0.0.1 5005 &

sleep 2
node failover.js Prueba 127.0.0.1 5000 &

sleep 2
node initiateUpdate.js Prueba server3.js 127.0.0.1 5000 &

sleep 2
node administrator.js Admin3 Prueba 127.0.0.1 5005 & 

sleep 2
node failover.js Prueba 127.0.0.1 5000 &

sleep 2
node administrator.js Admin4 Prueba 127.0.0.1 5005 &




echo "Done!"
