
const ResourceLoader = function() {

    const _makescript = function(url) {
        var el = document.createElement("script");
        el.type = "text/javascript";
        el.src = url;
        return el;
    };

    var _makestyle = function(url) {
        var el = document.createElement("link");
        el.rel = "stylesheet";
        el.type = "text/css";
        el.href = url;
        return el;
    }

    const _require = function(url) {
        return new Promise((resolve, reject) => {
            var el = url.endsWith(".js") ? _makescript(url) : _makestyle(url);
            el.onload = function() {
                resolve(url);
            };
            (document.head || document.documentElement).appendChild(el);
        });
    };

    this.require = function() {
        return new Promise((resolve, reject) => {
            tasks = [...arguments];
            for (var task of tasks) {
                _require(task)
                    .then((url) => {
                        var index = tasks.indexOf(url);
                        if (index != -1)
                            tasks[index] = null;
                        
                        if (tasks.join().replace(/,/g,'').length === 0)
                            resolve();
                    });
            }
        });
    };

    this.waitfor = function() {
        return new Promise((resolve, reject) => {
            var tasks = [...arguments];
            var x = setInterval(() => {
                for (var a of tasks) {
                    if (!eval("window." + a))
                        return;
                }

                clearInterval(x);
                resolve();
            }, 10);
        });
    }

};

function ModifyAircraft() {
    geofs.aircraft.Aircraft.prototype.load = function(a, b, c) {
        var isExternal = a.toString().indexOf("skyx") == 0;
        var loadUrl = geofs.url + "/models/aircraft/load.php";
        if (geofs.aircraftList[a] && geofs.aircraftList[a].local) {
            loadUrl = geofs.aircraftList[a].path + "aircraft.json";
        }
        if (isExternal) {
            loadUrl = "https://aircraft-loader.appspot.com/aircraft";
            a = a.substr(4);
        }
        $.ajax(loadUrl, {
            data: {
                id: a
            },
            dataType: "text",
            success: function(d, e, f) {
                if ("error" != e) {
                    if (geofs.aircraftList[a] && geofs.aircraftList[a].local && (d = JSON.stringify({
                        id: a,
                        name: geofs.aircraftList[a].name,
                        fullPath: geofs.aircraftList[a].path,
                        isPremium: !1,
                        isCommunity: !1,
                        definition: btoa(d)
                    })),
                    d = geofs.aircraft.instance.parseRecord(d)) {
                        if (!geofs.aircraftList[a] || !geofs.aircraftList[a].local) {
                            if (isExternal) {
                                geofs.aircraft.instance.aircraftRecord.fullPath = geofs.aircraft.instance.aircraftRecord.fullPath;
                            }
                            else {
                                geofs.aircraft.instance.aircraftRecord.fullPath = geofs.url + geofs.aircraft.instance.aircraftRecord.fullPath;
                            }
                        }
                        geofs.aircraft.instance.id = a;
                        geofs.aircraft.instance.init(d, b, c);

                        if (isExternal) {
                            if (geofs.aircraftList[geofs.aircraft.instance.aircraftRecord.altId])
                                geofs.preferences.aircraft = geofs.aircraft.instance.aircraftRecord.altId;
                            else
                                geofs.preferences.aircraft = 1;

                            geofs.preferences.real_aircraft = geofs.aircraft.instance.aircraftRecord.id;
                        }
                    }
                } else
                    geofs.aircraft.instance.loadDefault("Could not load aircraft file")
            },
            error: function(b, c, f) {
                a != geofs.aircraft.default && geofs.aircraft.instance.loadDefault("Could not load aircraft file" + f)
            }
        });
    };

    geofs.aircraft.Aircraft.prototype.addParts = function(a, b, c) {
        c = c || 1;
        for (var d = 0; d < a.length; d++) {
            var e = a[d];
            if (e.include) {
                var f = geofs.includes[e.include];
                e = $.extend(e, f[0]);
                for (var g = 1; g < f.length; g++) {
                    var h = $.extend({}, f[g], {
                        parent: e.name
                    });
                    h.name = e.name + h.name;
                    a.push(h)
                }
            }
        }
        for (d = 0; d < a.length; d++) {
            e = a[d];
            e.points = e.points || {};
            e.type = e.type || !1;
            e.brakesController = e.brakesController || !1;
            e.animations = e.animations || [];
            geofs.aircraft.instance.parts[e.name] = e;
            geofs.aircraft.instance.addOffsets(e, c);
            e.forceDirection && (e.forceDirection = AXIS_TO_INDEX[e.forceDirection]);
            e.rotation && (e.rotation = V3.toRadians(e.rotation));
            e.scale = e.scale || [1, 1, 1];
            e.scale = V3.scale(e.scale, c);
            e.originalScale = e.scale;
            if (e.model) {
                f = e.model;
                if (e.model[0] != "/" && e.model.indexOf("http") != 0) {
                    f = b + e.model;
                }
                e["3dmodel"] = geofs.loadModel(f, {
                    castShadows: e.noCastShadows ? !1 : !0,
                    receiveShadows: e.noReceiveShadows ? !1 : !0
                });
            }
            "GlassPanel" == e.type && (f = new geofs.GlassPanel(e),
            e.entity = f.entity,
            instruments.add(f, e.name));
            e.light && (e.lightBillboard = new geofs.light(null,e.light,{
                scale: .2
            }),
            geofs.aircraft.instance.lights.push(e));
            e.object3d = new Object3D(e);
            e.suspension && (e.suspension.length ? (e.suspension.origin = [e.collisionPoints[0][0], e.collisionPoints[0][1], e.collisionPoints[0][2] + e.suspension.length],
            f = e.suspension.length) : (e.suspension.origin = [e.collisionPoints[0][0], e.collisionPoints[0][1], 0],
            f = -e.collisionPoints[0][2]),
            e.suspension.restLength = f,
            "rotation" == e.suspension.motion ? (f = V3.length(e.collisionPoints[0]),
            f = Math.atan2(e.collisionPoints[0][0] / f, e.collisionPoints[0][2] / f),
            f = {
                type: "rotate",
                axis: e.suspension.axis || "Y",
                value: e.name + "Suspension",
                ratio: (0 > f ? f + HALF_PI : f - HALF_PI) * RAD_TO_DEGREES * (e.suspension.ratio || 1)
            }) : f = {
                type: "translate",
                axis: e.suspension.axis || "Z",
                value: e.name + "Suspension",
                ratio: e.suspension.ratio || 1
            },
            e.animations.push(f),
            e.suspension.hardPoint = e.suspension.hardPoint || .5,
            e.points.suspensionOrigin = V3.dup(e.suspension.origin));
            for (g = 0; g < e.animations.length; g++)
                f = e.animations[g],
                f.ratio = f.ratio || 1,
                f.offset = f.offset || 0,
                f.currentValue = null,
                f.delay && (f.ratio /= 1 - Math.abs(f.delay)),
                "rotate" == f.type && (h = f.method || "rotate",
                "parent" == f.frame && (h = "rotateParentFrame"),
                f.rotationMethod = e.object3d[h + f.axis]),
                "translate" == f.type && (geofs.isArray(f.axis) || (f.axis = AXIS_TO_VECTOR[f.axis]));
            "wheel" == e.type && (e.radius = e.radius || 1,
            e.arcDegree = e.radius * TWO_PI / 360,
            e.angularVelocity = 0,
            geofs.aircraft.instance.wheels.push(e));
            "airfoil" == e.type && (geofs.aircraft.instance.airfoils.push(e),
            e.stalls = e.stalls || !1,
            e.stallIncidence = e.stallIncidence || 12,
            e.zeroLiftIncidence = e.zeroLiftIncidence || 16,
            e.aspectRatio = e.aspectRatio || DEFAULT_AIRFOIL_ASPECT_RATIO,
            e.aspectRatioCoefficient = e.aspectRatio / e.aspectRatio + 2);
            "engine" == e.type && (e.rpm = 0,
            geofs.aircraft.instance.setup.originalInertia = geofs.aircraft.instance.setup.engineInertia,
            geofs.aircraft.instance.engines.push(e));
            "balloon" == e.type && (e.temperature = e.initialTemperature || 0,
            e.coolingSpeed = e.coolingSpeed || 0,
            geofs.aircraft.instance.balloons.push(e));
            if (e.collisionPoints)
                for (f = e.collisionPoints,
                g = geofs.aircraft.instance.setup.contactProperties[e.type],
                h = 0; h < f.length; h++)
                    f[h].part = e,
                    f[h].contactProperties = g,
                    geofs.aircraft.instance.collisionPoints.push(f[h]);
            e.controller && (geofs.aircraft.instance.controllers[e.controller.name] = e.controller)
        }
        for (d = 0; d < a.length; d++)
            e = a[d],
            "root" != e.name && (e.parent || (e.parent = "root"),
            geofs.aircraft.instance.parts[e.parent].object3d.addChild(e.object3d)),
            e.node && e.object3d.setModel(e.object3d.findModelInAncestry())
    };

    geofs.aircraft.Aircraft.prototype.loadCockpit = function() {
        if (!this._cockpitLoaded)
            if (geofs.aircraft.instance.setup.cockpitModel) {
                var a = geofs.aircraft.instance.aircraftRecord.id;
                var isExternal = geofs.aircraft.instance.aircraftRecord.altId
                var url = geofs.url + "/models/aircraft/load.php";
                if (geofs.aircraftList[a] && geofs.aircraftList[a].local) {
                    url = geofs.aircraftList[a].path + "cockpit/cockpit.json";
                }
                else if (isExternal) {
                    url = "https://aircraft-loader.appspot.com/aircraft";
                }
                $.ajax(url, {
                    data: {
                        id: a,
                        cockpit: !0
                    },
                    dataType: "text",
                    success: function(b, c) {
                        geofs.aircraftList[a].local && (b = JSON.stringify({
                            id: a,
                            name: geofs.aircraftList[a].name,
                            fullPath: geofs.aircraftList[a].path,
                            isPremium: !1,
                            isCommunity: !1,
                            definition: btoa(b)
                        }));
                        if (b = geofs.aircraft.instance.parseRecord(b)) {
                            geofs.aircraft.instance.cockpitSetup = b;
                            geofs.aircraft.instance._cockpitLoaded = !0;
                            if (!geofs.aircraftList[a] || !geofs.aircraftList[a].local) {
                                if (isExternal) {
                                    geofs.aircraft.instance.aircraftRecord.fullPath = geofs.aircraft.instance.aircraftRecord.fullPath;
                                }
                                else {
                                    geofs.aircraft.instance.aircraftRecord.fullPath = geofs.url + geofs.aircraft.instance.aircraftRecord.fullPath;
                                }
                            }
                            geofs.aircraft.instance.addParts(b.parts, geofs.aircraft.instance.aircraftRecord.fullPath + "cockpit/", geofs.aircraft.instance.cockpitSetup.scale);
                            instruments.rescale();
                            geofs.aircraft.instance.setup.cockpitScaleFix && geofs.aircraft.instance.fixCockpitScale(geofs.aircraft.instance.setup.cockpitScaleFix);
                            geofs.aircraft.instance.object3d.compute(geofs.aircraft.instance.llaLocation);
                            geofs.aircraft.instance.placeParts();
                            geofs.aircraft.instance.render()
                        }
                    }
                })
            } else
                geofs.aircraft.instance._cockpitLoaded = !0
    };

    geofs.aircraft.Aircraft.prototype.change = function(a, b) {
        a = a || this.aircraftRecord.id;
        geofs.doPause(!0);
        this.load(a, this.getCurrentCoordinates(), b);
        geofs.api.analytics.event("aircraft", (geofs.aircraftList[a] || {name: "SkyX Aircraft"}).name) // For google analytics, Xavier. Consider this line an expression of politeness.
    };

    // Initialization
    if (geofs.preferences.real_aircraft)
        geofs.aircraft.instance.change("skyx" + geofs.preferences.real_aircraft);
}

function ModifyMultiplayer() {
    multiplayer.sendUpdate = function() {
        var isExternal = geofs.aircraft.instance.aircraftRecord.altId;
        try {
            if (!multiplayer.lastRequest && !flight.recorder.playing) {
                var a = geofs.aircraft.instance
                  , b = Date.now();
                multiplayer.lastRequestTime = b;
                var c = $.merge($.merge([], a.llaLocation), a.htr);
                if (c.join() != multiplayer.lastJoinedCoordinates) {
                    multiplayer.lastJoinedCoordinates = c.join();
                    console.log(a.aircraftRecord);
                    var d = V3.scale(xyz2lla(a.rigidBody.getLinearVelocity(), a.llaLocation), .001)
                      , e = $.merge(d, a.htrAngularSpeed)
                      , f = {
                        acid: geofs.userRecord.id,
                        sid: geofs.userRecord.sessionId,
                        id: multiplayer.myId,
                        ac: isExternal ? a.aircraftRecord.altId : a.aircraftRecord.id, // If the aircraft is external, we'll send the alternative aircraft on the "ac" property so no phantom aircraft are created
                        co: c,
                        ve: e,
                        st: { // All the rest are validated. The "st" property is a free to sync object, so we can send info over this channel.
                            gr: a.groundContact,
                            skyx: isExternal ? a.aircraftRecord.id : null // And we'll use the "skyx" property for determining the URL of the aircraft. This will be the base path that was returned from the server.
                        },
                        ti: multiplayer.getServerTime(),
                        m: multiplayer.chatMessage,
                        ci: multiplayer.chatMessageId,
                        v: 115
                    };
                    multiplayer.chatMessage = "";
                    multiplayer.lastRequest = geofs.ajax.post(geofs.multiplayerHost + "/update", f, multiplayer.updateCallback, multiplayer.errorCallback)
                }
            }
        } catch (g) {
            geofs.debug.error(g, "multiplayer.sendUpdate")
        }
    };

    multiplayer.User.prototype.updateModel= function(a) {
        var b = this.getLOD(a);
        (!this.models || 0 == this.models.length) && 0 < b && b < multiplayer.numberOfLOD && (this.models = multiplayer.loadModels(a)); // Instead of giving the loadModels just the aircraft id, we'll give the player object so it can determine what kind of aircraft it is.
        if (b != this.lod) {
            this.removeModel();
            var c = b - 1;
            this.models.length > c && 0 <= c ? (this.model = this.models[c],
            geofs.api.addModelToWorld(this.model),
            multiplayer.visibleUsers[this.id] = this) : b == multiplayer.numberOfLOD && (multiplayer.visibleUsers[this.id] = this);
            this.lod = b
        }
        if (this.premium != a.p || this.callsign != a.cs)
            this.premium = a.p,
            this.callsign = a.cs,
            this.removeCallsign();
        this.label || (a = a.p ? "premium" : "default",
        a = this.isTraffic ? "traffic" : a,
        this.addCallsign(this.callsign, a))
    };

    multiplayer.loadModels = function(p) {
        var isExternal = p.st["skyx"]; // Are we using an external aircraft?
        var a = p.ac;
        var b = [];
        if (geofs.aircraftList[a]) {
            var c = isExternal ? ("https://aircraft-loader.appspot.com/" + p.st["skyx"] + "/multiplayer.glb") : (PAGE_PATH + geofs.aircraftList[a].path + "/multiplayer.glb"); // Determining where to take the stuff from
            a = isExternal ? ("https://aircraft-loader.appspot.com/"  + p.st["skyx"] + "/multiplayer-low.glb") : (PAGE_PATH + geofs.aircraftList[a].path + "/multiplayer-low.glb"); // Also for low res model.
            b.push(geofs.loadModel(c, {
                justLoad: !0
            }));
            b.push(geofs.loadModel(a, {
                justLoad: !0
            }))
        }
        return b
    };

    multiplayer.User.prototype.updateAircraftName= function(a) {
        ((this.aircraft == a.ac && this.aircraftName) && (!a.st["skyx"] || a.st["skyx"] == this["skyx"])) || (this.aircraft = a.ac, // Checking for changes of "st:rac" in parallel to those of "ac"
        this.aircraftName = geofs.aircraftList[this.aircraft] ? geofs.aircraftList[this.aircraft].name : "unknown",
        this.lod = null,
        this.rac = a.st ? (a.st["rac"] || null) : null,
        this.models = [])
    }
}

window.skyx = {};
window.skyx.loader = new ResourceLoader();
window.require = window.skyx.loader.require;
window.waitfor = window.skyx.loader.waitfor;

function main() {
    console.log("Everything is loaded");
    ModifyAircraft();
    ModifyMultiplayer();
}

waitfor(
    "$",
    "geofs",
    "geofs.aircraft"
).then(() => {
    main();
})
