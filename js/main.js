var headset;
var teleportationRequestInitiated = false;
var teleportationCircle;
var haloCenter = new BABYLON.Vector3(0, 0, 0);



// If a VR headset is connected, get its info
navigator.getVRDisplays().then(function (displays) {
    if (displays[0]) {
        headset = displays[0];
    }
});

window.addEventListener('DOMContentLoaded', function () {
    const OFFICESCALE = 20;         // How much to multiple the size of the dino by




    // Game states
    var begin = false;          // Flag to determine whether the game should begin

    var office;
    var camera;                 // The camera for the scene
    var collidableObjects = []; // Array holding all meshes that are collidable


    // UI elements
    var startUI = new BABYLON.GUI.TextBlock();

    // Connects an xbox controller has been plugged in and and a button/trigger moved
    function onNewGamepadConnected(gamepad) {
        var xboxpad = gamepad

        xboxpad.onbuttondown(function (buttonValue) {
            // When the A button is pressed, either start or reload the game depending on the game state
            if (buttonValue == BABYLON.Xbox360Button.A) {

                // Game is over, reload it
                if (gameOver) {
                  location.href = location.href;
                }
                // Game has begun
                else {
                    // Hide "Press A to start" UI
                    startUI.isVisible = false;
                    begin = true;
                }
            }
        });
    }

    function onControllersAttached() {
    console.log("Both VR controllers detected.");
    
    if (camera.leftController) {
        // Removing the gaze circle when using VR controllers
        if (target) {
            target.isVible = false;
        }

        // A button on Oculus Touch, Grip button on Vive
        camera.leftController.onMainButtonStateChangedObservable.add(function (stateObject) {
            // on pressed
            if (stateObject.value === 1) {
                teleportationRequestInitiated = true;
            }
            // on released
            else {
                if (teleportationAllowed) {
                    camera.position.x = haloCenter.x;
                    camera.position.z = haloCenter.z;
                }
                teleportationRequestInitiated = false;
            }
        });
    }
}

    // Get all connected gamepads
    var gamepads = new BABYLON.Gamepads(function (gamepad) { onNewGamepadConnected(gamepad); });


    // Grab where we'll be displayed the game
    var canvas = document.getElementById('renderCanvas');

    // load the 3D engine
    var engine = new BABYLON.Engine(canvas, true);
    

    // Creates and return the scene
    var createScene = function () {

        // Create the Babylon scene
        var scene = new BABYLON.Scene(engine);

        // Apply gravity so that any Y axis movement is ignored
        scene.gravity = new BABYLON.Vector3(0, -9.81, 0);

        // create a UniversalCamera that be controlled with gamepad or keyboard
        if(headset){
            // Create a WebVR camera with the trackPosition property set to false so that we can control movement with the gamepad
            camera = new BABYLON.WebVRFreeCamera("vrcamera", new BABYLON.Vector3(0, 13, 0), scene, true, { trackPosition: true });
            camera.deviceScaleFactor = 1;
        } else {
            // No headset, use universal camera
            camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 15, 0), scene);
        }
        camera.rotation.y += degreesToRadians(90);


        // Set the ellipsoid around the camera. This will act as the collider box for when the player runs into walls
        camera.ellipsoid = new BABYLON.Vector3(1, 9, 1);
        camera.applyGravity = true;

        scene.onPointerDown = function () {
            scene.onPointerDown = undefined
            camera.attachControl(canvas, true);
        }


        // Allow camera to be controlled
        camera.attachControl(canvas, true);

        // Create the skybox
        var skybox = BABYLON.Mesh.CreateBox("skyBox", 5000.0, scene);
        var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.disableLighting = true;
        skybox.material = skyboxMaterial;

        // GUI
        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        // Start UI
        startUI = new BABYLON.GUI.Rectangle("start");
        startUI.background = "black"
        startUI.alpha = .8;
        startUI.thickness = 0;
        startUI.height = "60px";
        startUI.width = "400px";
        advancedTexture.addControl(startUI); 
        var tex2 = new BABYLON.GUI.TextBlock();
        tex2.text = "Start exploring!";
        tex2.color = "white";
        startUI.addControl(tex2); 

        // return the created scene
        return scene;
    }

    // Listen for if the window changes sizes and adjust
    window.addEventListener('resize', onWindowResize, false);
    // Create the scene
    var scene = createScene();

    // Load the office model
    BABYLON.SceneLoader.ImportMesh("Office", "models/", "office-floor.babylon", scene, function (newMeshes) {

        office = newMeshes[0];

        // Set the initial size and position of the office
        //office.scaling = new BABYLON.Vector3(OFFICESCALE, OFFICESCALE, OFFICESCALE);
        office.position = new BABYLON.Vector3(0, 16, 0);

        // Run the render loop (fired every time a new frame is rendered)
        animate();

    });

    // Create the walls/ground
    addLights();
    enableAndCheckCollisions();

    // Create some lights to brighten up our scene
    function addLights() {
        var light0 = new BABYLON.PointLight('light0', new BABYLON.Vector3(1, 10, 0), scene);
        light0.groundColor = new BABYLON.Color3(0, 0, 0);

        var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
        light1.diffuse = new BABYLON.Color3(.5, .5, .5);
        light1.specular = new BABYLON.Color3(.5, .5, .5);
        light1.groundColor = new BABYLON.Color3(0, 0, 0);
    }




    // Enable collision checks for environment meshes and the camera
    function enableAndCheckCollisions() {
        scene.collisionsEnabled = true;
        camera.checkCollisions = true;
        ground.checkCollisions = true;

        // Loop through all walls and make them collidable
        for (var i = 0; i < collidableObjects.length; i++) {
            collidableObjects[i].checkCollisions = true;
        }
    }

    // Run the render loop (fired every time a new frame is rendered)
    function animate() {

        engine.runRenderLoop(function () {
            // Determine which camera should be showing depending on whether or not the headset is presenting
            if (headset) {
                if (!(headset.isPresenting)) {
                    var camera2 = new BABYLON.UniversalCamera("Camera", new BABYLON.Vector3(0, 18, -45), scene);
                    scene.activeCamera = camera2;
                    camera2.globalPosition = camera.globalPosition;
                } else {
                    scene.activeCamera = camera;
                }
            }
            scene.render();

            // Get the change in time between the last frame and the current frame
            var delta = engine.getDeltaTime() / 1000;

            // Check if A has been pressed to start the game
            if (begin == true) {


            }
        });
    }



    // Helper function that generates a random integer within a range
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }


    // Helper function that converts degrees to radians
    function degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    // Helper function that converts radians to degrees
    function radiansToDegrees(radians) {
        return radians * 180 / Math.PI;
    }

    // Helper function to compute a directional vector in the frame of reference of a mesh
    function vecToLocal(vector, mesh) {
        // Get the position of the mesh compared to the world
        var m = mesh.getWorldMatrix();
        // Get direction vector in relation to mesh
        var v = BABYLON.Vector3.TransformCoordinates(vector, m);
        return v;
    }


    // When the window resizes, adjust the engine size
    function onWindowResize() {
        engine.resize();
    }
});
