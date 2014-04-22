var albumTimeline = angular.module('albumApp', ['ui.bootstrap']);

albumTimeline.controller('TypeaheadCtrl', ['$scope', '$http',
    function($scope, $http) {
        $scope.getArtists = function(val) {

            return $http.get('http://ws.spotify.com/search/1/artist?', {
                params: {
                    q: val,
                }
            }).then(function(res) {
                return res.data.artists;
            });
        }
    }
]);


albumTimeline.directive("timelineviz",
    function() {
        return {
            restrict: 'E',
            //scope : {directiveArtist : artist}// selective 
            template: '<div id="vis-container"></div>',
            controller: function($scope) {},
            link: function(scope) {
                // run array of promises
                var all = function(array) {
                    var deferred = $.Deferred();
                    var fulfilled = 0,
                        length = array.length;
                    var results = [];

                    if (length === 0) {
                        deferred.resolve(results);
                    } else {
                        array.forEach(function(promise, i) {
                            $.when(promise()).then(function(value) {
                                results[i] = value;
                                fulfilled++;
                                if (fulfilled === length) {
                                    deferred.resolve(results);
                                }
                            });
                        });
                    }

                    return deferred.promise();
                };

                getArtist = function(artistHref) {
                    var promise = $.ajax({
                        url: 'http://ws.spotify.com/lookup/1/.json',
                        type: 'GET',
                        dataType: 'json',
                        data: {
                            uri: artistHref,
                            extras: 'albumdetail'
                        }
                    });
                    return promise.then(function(artist) {
                        return artist;
                    });
                }

                populateAlbumWithScore = function(artistWithAlbums) {

                    var promises = []; // array of deferred objects

                    artistWithAlbums.artist.albums.forEach(function(album) {
                        promises.push(function() {
                            return $.Deferred(function(dfd) {
                                $.ajax({
                                    url: 'http://ws.spotify.com/lookup/1/.json',
                                    type: 'GET',
                                    dataType: 'json',
                                    data: {
                                        uri: album.album.href,
                                        extras: 'trackdetail'
                                    },
                                    success: function(response) {
                                        var total_pop = 0;
                                        var total_length = 0;
                                        var track_artist_array = [];
                                        // Add popularity for each track
                                        $.each(response.album.tracks, function(index, track) {
                                            total_pop += track.popularity * 100;
                                            total_length += track.length;
                                            $.each(track.artists, function(index, artist) {
                                                if (!_.contains(track_artist_array, artist.href))
                                                    track_artist_array.push(artist.href);
                                            })
                                        });
                                        album.score = total_pop / response.album.tracks.length;
                                        album.trackCount = response.album.tracks.length;
                                        album.totalLength = total_length;
                                        album.smellsLikeACompilation = track_artist_array.length > 3;
                                        dfd.resolve(response);
                                    }
                                });
                            }).promise();
                        });
                    });

                    return $.when(all(promises)).then(function(results) {
                        artistWithAlbums.artist.albums = _.filter(artistWithAlbums.artist.albums, function(album) {
                            return album.album.availability.territories.match(/GB/) && album.info.type === 'album' && isAnAlbum(album);
                        });

                        return artistWithAlbums;
                    });
                }

                // Do business logic [call a service]
                scope.$watch('asyncSelected', function(asyncSelected) {
                    if (asyncSelected) {
                        console.log('loading albums...');
                        clearVisualisation();
                        getArtist(asyncSelected.href).then(populateAlbumWithScore).then(function(albums) {
                            console.log('Loaded');
                            if (albums) drawVisualisation(albums)
                        });
                    }
                });

                isAnAlbum = function(album) {
                    console.log(album.album.name + ":" + album.score);
                    if (album.trackCount < 5 || album.totalLength < 1000 || album.smellsLikeACompilation) { //Subjective call!
                        return false;
                    }
                    return true;
                }

                // handy: http://alignedleft.com/content/03-tutorials/01-d3/160-axes/5.html
                // http://alignedleft.com/tutorials/d3/axes
                drawVisualisation = function(data) {
                    var dataset = data.artist.albums;

                    var width = 1000,
                        height = 400,
                        color = d3.scale.category20b();

                    var PADDING = 50;
                    var MAX_RADIUS;

                    var svg = d3.select("#vis-container")
                        .append("svg")
                        .attr("width", width)
                        .attr("height", height);

                    var lineheight = 20;
                    d3.select("#artist-name").text(data.artist.name);

                    var xScale = d3.scale.linear()
                        .domain([d3.min(dataset, function(d) {
                            return d.album.released;
                        }), d3.max(dataset, function(d) {
                            return d.album.released;
                        })])
                        .range([PADDING, width - PADDING * 2]);

                    var yScale = d3.scale.linear()
                        .domain([d3.min(dataset, function(d) {
                            return d.score;
                        }), d3.max(dataset, function(d) {
                            return d.score;
                        })])
                        .range([height - PADDING, PADDING]);

                    var rScale = d3.scale.linear()
                        .domain([d3.min(dataset, function(d) {
                            return d.score;
                        }), d3.max(dataset, function(d) {
                            return d.score;
                        })])
                        .range([0, 50]);

                    svg.selectAll("circle")
                        .data(dataset)
                        .enter()
                        .append("circle")
                        .attr("fill", function(d) {
                            return color(d.album.name);
                        })
                        .attr("fill-opacity", 0.9)
                        .attr("cx", function(d) {
                            return xScale(d.album.released);
                        })
                        .attr("cy", height)
                        .transition()
                        .duration(1500)
                        .attr("cy", function(d) {
                            // i recks would be nice if this was based on say, public popularity?... dunno, just 
                            // thinking, say, downloads vs critical review might be interesting.
                            // ... but for now, based on rScale
                            return yScale(d.score);
                        })
                        .attr("r", function(d) {
                            // will be based on score
                            return rScale(d.score);
                        });


                    svg.selectAll("text")
                        .data(dataset)
                        .enter()
                        .append("text")
                        .text(function(d) {
                            return d.album.name;
                        })
                        .attr("x", function(d) {
                            return xScale(d.album.released);
                        })
                        .attr("y", height)
                        .transition()
                        .duration(1500)
                        .attr("y", function(d) {
                            return yScale(d.score);
                        })
                        .attr("text-anchor", "middle")
                        .attr("font-family", "sans-serif")
                        .attr("font-size", "11px")
                        .attr("fill", "black");


                    // create axes
                    var xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .ticks(5)
                        .tickFormat(d3.format("<"));
                    svg.append("g")
                        .attr("class", "axis")
                        .attr("transform", "translate(0," + (height - PADDING) + ")")
                        .call(xAxis);
                }

                clearVisualisation = function() {
                    d3.select("svg").remove();
                }
            }
        }
    });