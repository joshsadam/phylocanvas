var getCollectionId = function() {
	// Do something
};

exports.add = function(req, res) {
	var collectionId = req.body.collectionId;

	console.log('Adding collection! collectionId: ' + collectionId);

	console.log('[WGST] ' + (collectionId.length > 0 ? 'Received request for collection id: ' + collectionId: 'Received request for new collection id'));

	var uuid = require('node-uuid'),
		userAssemblyIds = req.body.userAssemblyIds,
		isNewCollection = true;

	// Create new collection id
	if (collectionId.length === 0) {
		console.log('New collection id');

		// Prepare object to publish
		var collectionRequest = {
			taskId: 'new',
			inputData: userAssemblyIds
		};

	// Reuse existing collection id and just get new user assembly id to assembly id mapping
	}  else {
		console.log('Reusing collection id');

		// Prepare object to publish
		var collectionRequest = {
			taskId: collectionId,
			inputData: userAssemblyIds
		};

		isNewCollection = false;		
	}

	// TODO: Validate request

	// Call RabbitMQ
	var amqp = require('amqp'),
		connection = amqp.createConnection({
			host: '129.31.26.152', //'129.31.26.152', //'fi--didewgstcn1.dide.local',
			port: 5670
		}, {
			reconnect: false,
			autoDelete: true
		});

	connection.on('error', function(error) {
	    console.error('✗ [WGST][RabbitMQ][ERROR] Ignoring error: ' + error);
	});

	connection.on("ready", function(){
		console.log('[WGST][RabbitMQ] Connection is ready');

		var queueId = 'ART_CREATE_COLLECTION_' + uuid.v4(),
			exchange = connection.exchange('grid-ex', {
				type: 'direct',
				passive: true,
				durable: false,
				confirm: false,
				autoDelete: false,
				noDeclare: false,
				confirm: false
			}, function(exchange) {
				console.log('[WGST][RabbitMQ] Exchange "' + exchange.name + '" is open');
			});

		// Publish message
		exchange.publish('id-request', collectionRequest, { 
			mandatory: true,
			contentType: 'application/json',
			deliveryMode: 1,
			correlationId: 'Art', // Generate UUID?
			replyTo: queueId
		}, function(err){
			if (err) {
				console.log('✗ [WGST][RabbitMQ][ERROR] Error in trying to publish');
				return; // return undefined?
			}

			console.log('[WGST][RabbitMQ] Message was published');
		});

		connection
		.queue(queueId, { // Create queue
			passive: false,
			durable: false,
			exclusive: true,
			autoDelete: true,
			noDeclare: false,
			closeChannelOnUnsubscribe: false
		}, function(queue){
			console.log('[WGST][RabbitMQ] Queue "' + queue.name + '" is open');

		}) // Subscribe to response message
		.subscribe(function(message, headers, deliveryInfo){
			console.log('[WGST][RabbitMQ] Received response');

			var buffer = new Buffer(message.data),
				data = JSON.parse(buffer.toString()),
				collectionId = data.uuid,
				userAssemblyIdToAssemblyIdMap = data.idMap;

			if (isNewCollection) {
				couchbaseDatabaseConnections[testWgstFrontBucket].set('collection_' + collectionId, userAssemblyIdToAssemblyIdMap, function(err, result) {
					if (err) {
						console.error('✗ [WGST][Couchbase][ERROR] ' + err);
						return;
					}

					console.log('[WGST][Couchbase] Inserted new collection:');
					console.dir(result);

					console.dir(userAssemblyIdToAssemblyIdMap);

					// Return result data
					res.json({
						collectionId: collectionId,
						userAssemblyIdToAssemblyIdMap: userAssemblyIdToAssemblyIdMap
					});

					// End connection, however in reality it's being dropped before it's ended so listen for error too
					connection.end();
				});
			} else {
				// Get list of assemblies
				couchbaseDatabaseConnections[testWgstFrontBucket].get('collection_' + collectionId, function(err, existingUserAssemblyIdToAssemblyIdMap) {
					if (err) throw err;

					console.log('Does that look correct to you?');
					console.dir(existingUserAssemblyIdToAssemblyIdMap);

					// Merge exisinting user assembly id to assembly id map with a new one
					var updatedUserAssemblyIdToAssemblyIdMap = existingUserAssemblyIdToAssemblyIdMap.value,
						assemblyId;

					for (assemblyId in userAssemblyIdToAssemblyIdMap) {
						updatedUserAssemblyIdToAssemblyIdMap[assemblyId] = userAssemblyIdToAssemblyIdMap[assemblyId];
					}

					couchbaseDatabaseConnections[testWgstFrontBucket].set('collection_' + collectionId, updatedUserAssemblyIdToAssemblyIdMap, function(err, result) {
						if (err) {
							console.error('✗ [WGST][Couchbase][ERROR] ' + err);
							return;
						}

						console.log('[WGST][Couchbase] Updated existing collection:');
						console.dir(result);

						// Return result data
						res.json({
							collectionId: collectionId,
							userAssemblyIdToAssemblyIdMap: updatedUserAssemblyIdToAssemblyIdMap
						});

						// End connection, however in reality it's being dropped before it's ended so listen for error too
						connection.end();
					});
				});
			} // else
		});
	});
};

var getAssemblies = function(assemblyIds, callback) {
	console.log('[WGST] Getting assemblies with ids:');
	console.dir(assemblyIds);

	// Prepend FP_COMP_ to each assembly id
	var scoresAssemblyIds = assemblyIds.map(function(assemblyId){
		return 'FP_COMP_' + assemblyId;
	});

	// Prepend ASSEMBLY_METADATA_ to each assembly id
	var metadataAssemblyIds = assemblyIds.map(function(assemblyId){
		return 'ASSEMBLY_METADATA_' + assemblyId;
	});

	// Prepend PAARSNP_RESULT_ to each assembly id
	var resistanceProfileAssemblyIds = assemblyIds.map(function(assemblyId){
		return 'PAARSNP_RESULT_' + assemblyId;
	});

	// Prepend MLST_RESULT_ to each assembly id
	var mlstAssemblyIds = assemblyIds.map(function(assemblyId){
		return 'MLST_RESULT_' + assemblyId;
	});

	// Merge all assembly ids
	assemblyIds = scoresAssemblyIds
						.concat(metadataAssemblyIds)
						.concat(resistanceProfileAssemblyIds)
						.concat(mlstAssemblyIds);

	console.log('[WGST] Querying keys:');
	console.dir(assemblyIds);

	couchbaseDatabaseConnections[testWgstBucket].getMulti(assemblyIds, {}, function(err, assembliesData) {
		console.log('[WGST] Got assemblies data');
		console.dir(assembliesData);

		if (err) throw err;

		// Merge FP_COMP and ASSEMBLY_METADATA into one assembly object
		var assemblies = {},
			assemblyId,
			assemblyKey;

		for (assemblyKey in assembliesData) {
            // Parsing assembly scores
            if (assemblyKey.indexOf('FP_COMP_') !== -1) {
            	assemblyId = assemblyKey.replace('FP_COMP_','');
            	assemblies[assemblyId] = assemblies[assemblyId] || {};
				assemblies[assemblyId]['FP_COMP'] = assembliesData[assemblyKey].value;
            // Parsing assembly metadata
            } else if (assemblyKey.indexOf('ASSEMBLY_METADATA_') !== -1) {
            	assemblyId = assemblyKey.replace('ASSEMBLY_METADATA_','');
            	assemblies[assemblyId] = assemblies[assemblyId] || {};
				assemblies[assemblyId]['ASSEMBLY_METADATA'] = assembliesData[assemblyKey].value;
            // Parsing assembly resistance profile
            } else if (assemblyKey.indexOf('PAARSNP_RESULT_') !== -1) {
            	assemblyId = assemblyKey.replace('PAARSNP_RESULT_','');
            	assemblies[assemblyId] = assemblies[assemblyId] || {};
				assemblies[assemblyId]['PAARSNP_RESULT'] = assembliesData[assemblyKey].value;
            // Parsing MLST
            } else if (assemblyKey.indexOf('MLST_RESULT_') !== -1) {
            	assemblyId = assemblyKey.replace('MLST_RESULT_','');
            	assemblies[assemblyId] = assemblies[assemblyId] || {};
				assemblies[assemblyId]['MLST_RESULT'] = assembliesData[assemblyKey].value;
			} // if
		} // for

		console.log('[WGST] Assemblies with merged FP_COMP, ASSEMBLY_METADATA, PAARSNP_RESULT and MLST_RESULT data:');
		console.dir(assemblies);

		//Get ST (Sequence Type) code
		var assemblyStQueryKeys = {}, // Map assembly id to ST query key
			stQueryKeys = [],
			stQueryKey,
			alleles,
			alleleId;

		for (assemblyId in assemblies) {
			if (assemblies.hasOwnProperty(assemblyId)) {
				alleles = assemblies[assemblyId]['MLST_RESULT'].alleles;
				stQueryKey = 'ST_' + '1280';

				console.log('alleles:');
				console.dir(alleles);

				for (allele in alleles) {
					if (alleles.hasOwnProperty(allele)) {
						alleleId = alleles[allele].alleleId;
						stQueryKey = stQueryKey + '_' + alleleId;
					}
				}

				stQueryKeys.push(stQueryKey);
				assemblyStQueryKeys[assemblyId] = stQueryKey;
			} // if
		} // for

		console.log('stQueryKeys:');
		console.dir(stQueryKeys);

		// couchbaseDatabaseConnections[testWgstResourcesBucket].getMulti(stQueryKeys, {}, function(err, stCodes){
		// 	console.log('[WGST][Couchbase] Got Sequence Type codes');
		// 	console.dir(stCodes);
		// });





		// 				// If allele id is NEW then don't query ST (Sequence Types) codes
		// 				alleleId = alleles[allele].alleleId;
		// 				if (alleleId !== 'NEW') {
		// 					stQueryKey = stQueryKey + '_' + alleleId;


		// 					// If no result > show NEW
		// 				}




		// 	// 'ST_' + species id + allele ids
		// 	stQueryKey = 'ST_' + '1280';

		// 	for (allele in alleles) {
		// 		if (alleles.hasOwnProperty(allele)) {
		// 			// If allele id is NEW then don't query ST (Sequence Types) codes
		// 			alleleId = alleles[allele].alleleId;
		// 			if (alleleId !== 'NEW') {
		// 				stQueryKey = stQueryKey + '_' + alleleId;


		// 				// If no result > show NEW
		// 			}
		// 		}
		// 	}

		// 	stQueryKeys.push(stQueryKey);


		// 	stQueryKey = assemblies[assemblyId]['MLST_RESULT']



			
		// }

		// var stQueryKeys = '';





		// If NEW > don't query ST (Sequence Types) codes
		// If no result > show NEW

		callback(null, assemblies);
	});
};

var getCollection = function(collectionId, callback) {

	var collectionId = req.body.collectionId,
		collection = {};

	console.log('[WGST] Getting collection ' + collectionId);

	// Get list of assemblies
	couchbaseDatabaseConnections[testWgstBucket].get('COLLECTION_LIST_' + collectionId, function(err, assemblyIdsData) {
		if (err) throw err;

		var assemblyIds = assemblyIdsData.value.assemblyIdentifiers;

		console.log('[WGST] Got collection ' + collectionId + ' with assembly ids:');
		console.log(assemblyIds);

		getAssemblies(assemblyIds, function(error, assemblies){
			if (error) throw error;

			collection.assemblies = assemblies;

			// Get collection tree data
			couchbaseDatabaseConnections[testWgstBucket].get('COLLECTION_TREE_' + collectionId, function(err, collectionTreeData) {
				if (err) throw err;

				var collectionTreeData = collectionTreeData.value.newickTree;

				console.log('[WGST] Got collection tree data for collection id ' + collectionId + ':');
				console.log(collectionTreeData);

				collection.tree = {
					data: collectionTreeData
				};

				callback(null, collection);
			});
		});
	});
};

exports.apiGetCollection = function(req, res) {

	var collectionId = req.body.collectionId,
		collection = {
			assemblies: {},
			tree: {}
		};

	console.log('[WGST] Getting collection ' + collectionId);

	// Get list of assemblies
	couchbaseDatabaseConnections[testWgstBucket].get('COLLECTION_LIST_' + collectionId, function(err, assemblyIdsData) {
		if (err) throw err;

		var assemblyIds = assemblyIdsData.value.assemblyIdentifiers;

		console.log('[WGST] Got collection ' + collectionId + ' with assembly ids:');
		console.dir(assemblyIds);

		var assemblyCounter = assemblyIds.length;
		for (;assemblyCounter !== 0;) {
			assemblyCounter = assemblyCounter - 1;

			var assemblyId = assemblyIds[assemblyCounter];

			require('./assembly').getAssembly(assemblyId, function(error, assembly){
				if (error) throw error;

				console.log('[WGST] Got assembly ' + assembly.ASSEMBLY_METADATA.assemblyId);

				var assemblyId = assembly.ASSEMBLY_METADATA.assemblyId;

				collection.assemblies[assemblyId] = assembly;

				// If got all assemblies
				if (Object.keys(collection.assemblies).length === assemblyIds.length) {
					// Get collection tree data
					couchbaseDatabaseConnections[testWgstBucket].get('COLLECTION_TREE_' + collectionId, function(err, collectionTreeData) {
						if (err) throw err;

						var collectionTreeData = collectionTreeData.value.newickTree;

						console.log('[WGST] Got collection tree data for ' + collectionId + ' collection:');
						console.dir(collectionTreeData);

						collection.tree = collectionTreeData;

						// Get antibiotics
						require('./assembly').getAllAntibiotics(function(error, antibiotics){
							if (error) throw error;

							res.json({
								collection: collection,
								antibiotics: antibiotics
							});
						});
					});
				} // if
			});
		} // for

		// // Get assemblies
		// getAssemblies(assemblyIds, function(error, assemblies){
		// 	if (error) throw error;

		// 	collection.assemblies = assemblies;

		// 	// Get collection tree data
		// 	couchbaseDatabaseConnections[testWgstBucket].get('COLLECTION_TREE_' + collectionId, function(err, collectionTreeData) {
		// 		if (err) throw err;

		// 		var collectionTreeData = collectionTreeData.value.newickTree;

		// 		console.log('[WGST] Got collection tree data for ' + collectionId + ' collection:');
		// 		console.dir(collectionTreeData);

		// 		collection.tree = {
		// 			data: collectionTreeData
		// 		};

		// 		// Get antibiotics
		// 		require('./assembly').getAllAntibiotics(function(error, antibiotics){
		// 			if (error) throw error;

		// 			res.json({
		// 				collection: collection,
		// 				antibiotics: antibiotics
		// 			});
		// 		});
		// 	});
		// });
	});
};

// exports.apiGetCollection = function(req, res) {

// 	var collectionId = req.body.collectionId,
// 		collection = {};

// 	console.log('[WGST] Getting collection ' + collectionId);

// 	// Get list of assemblies
// 	couchbaseDatabaseConnections[testWgstBucket].get('COLLECTION_LIST_' + collectionId, function(err, assemblyIdsData) {
// 		if (err) throw err;

// 		var assemblyIds = assemblyIdsData.value.assemblyIdentifiers;

// 		console.log('[WGST] Got collection ' + collectionId + ' with assembly ids:');
// 		console.dir(assemblyIds);

// 		var assemblyCounter = assemblyIds.length;
// 		for (;assemblyCounter !== 0;) {
// 			exports.getAssembly();
// 		} 

// 		// Get assemblies
// 		getAssemblies(assemblyIds, function(error, assemblies){
// 			if (error) throw error;

// 			collection.assemblies = assemblies;

// 			// Get collection tree data
// 			couchbaseDatabaseConnections[testWgstBucket].get('COLLECTION_TREE_' + collectionId, function(err, collectionTreeData) {
// 				if (err) throw err;

// 				var collectionTreeData = collectionTreeData.value.newickTree;

// 				console.log('[WGST] Got collection tree data for ' + collectionId + ' collection:');
// 				console.dir(collectionTreeData);

// 				collection.tree = {
// 					data: collectionTreeData
// 				};

// 				// Get antibiotics
// 				require('./assembly').getAllAntibiotics(function(error, antibiotics){
// 					if (error) throw error;

// 					res.json({
// 						collection: collection,
// 						antibiotics: antibiotics
// 					});
// 				});
// 			});
// 		});
// 	});
// };

exports.get = function(req, res) {
	var collectionId = req.params.id;

	console.log('[WGST] Requested ' + collectionId + ' collection');

	res.render('index', {
		appConfig: JSON.stringify(appConfig.client),
		requestedCollectionId: collectionId
	});
};