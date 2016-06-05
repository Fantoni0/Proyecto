
node belongingLayer.js 127.0.0.1 5000 127.0.0.1 5001 &
echo "Belonging Layer launched"
sleep 1
number=1
while [ $number -lt 6 ]; do
	node server.js Prueba 1.0 127.0.0.2 6001 127.0.0.1 5000 127.0.0.2 $((6020+number)) &
	echo "Server $number launched"
	number=$((number+1))
	sleep 1
done
sleep 1
number=1
while [ $number -lt 3 ]; do
	node client.js $number 127.0.0.2 6001 &
	echo "Client $number launched" 
	number=$((number+1))
done

sleep 6
node failover.js 127.0.0.1 5000 &
echo "Done!"
