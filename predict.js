var trafficLanes = [
    {
        information: "N/A",
        durationInMinutes: 0,
        previousDurationInMinutes: 0,
        duration: function () {
            return 1000 * 60 * this.durationInMinutes;
        },
        difference: function () {
            return this.durationInMinutes - this.previousDurationInMinutes;
        },
    },
];

let imageLoaded = false;
$("#image-selector").change(function () {
    imageLoaded = false;
    let reader = new FileReader();
    reader.onload = function () {
        let dataURL = reader.result;
        $("#selected-image").attr("src", dataURL);
        $("#prediction-list").empty();
        imageLoaded = true;
    };

    let file = $("#image-selector").prop("files")[0];
    reader.readAsDataURL(file);
});

let model;
let modelLoaded = false;
$(document).ready(async function () {
    modelLoaded = false;
    $(".progress-bar").show();
    console.log("Loading model...");
    model = await tf.loadGraphModel("model/model.json");
    console.log("Model loaded.");
    $(".progress-bar").hide();
    modelLoaded = true;
});

$("#predict-button").click(async function () {
    if (!modelLoaded) {
        alert("The model must be loaded first");
        return;
    }
    if (!imageLoaded) {
        alert("Please select an image first");
        return;
    }

    let image = $("#selected-image").get(0);

    // Pre-process the image
    console.log("Loading image...");
    let tensor = tf.browser
        .fromPixels(image, 3)
        .resizeNearestNeighbor([224, 224]) // change the image size
        .expandDims()
        .toFloat()
        .reverse(1); // RGB -> BGR
    let predictions = await model.predict(tensor).data();
    console.log(predictions);
    let top5 = Array.from(predictions)
        .map(function (p, i) {
            // this is Array.map
            return {
                probability: p,
                className: TARGET_CLASSES[i], // we are selecting the value from the obj
            };
        })
        .sort(function (a, b) {
            return b.probability - a.probability;
        })
        .slice(0, 2);

    $("#prediction-list").empty();
    $("#traffic-information").empty();
    top5.forEach(function (p, index) {
        console.log("prediction", p);
        $("#prediction-list").append(
            `<li>${p.className}: ${p.probability.toFixed(6)}</li>`
        );
        if (p.className === "Traffic") {
            determineTraffic(p.probability);
            var trafficInfo = trafficLanes[0];
            console.log("trafficInfo", trafficInfo);
            $("#traffic-information").append(
                `<li>Status: ${trafficInfo.information}</li>`
            );
            $("#traffic-information").append(
                `<li>Duration: Time ${
                    trafficInfo.difference() === 0
                        ? "remains at"
                        : trafficInfo.difference() > 0
                        ? "increased to"
                        : "reduced to"
                } ${trafficInfo.durationInMinutes} minutes </li>`
            );
        }
    });
});

function determineTraffic(trafficValue) {
    console.log("trafficValue", trafficValue);
    var trafficValuePercentage = parseFloat(trafficValue * 100).toFixed(4);
    console.log("trafficValuePercentage", trafficValuePercentage);
    var trafficInfo = trafficLanes[0];
    trafficInfo.durationInMinutes = trafficInfo.previousDurationInMinutes;

    if (trafficValuePercentage > 80) {
        trafficInfo.durationInMinutes = 5;
        trafficInfo.information = "Heavy Traffic";
        trafficLanes[0] = trafficInfo;
        return true;
    }
    if (trafficValuePercentage > 75) {
        trafficInfo.durationInMinutes = 4;
        trafficInfo.information = "Moderate Traffic";
        trafficLanes[0] = trafficInfo;
        return true;
    }
    if (trafficValuePercentage > 60) {
        trafficInfo.durationInMinutes = 3;
        trafficInfo.information = "Normal Traffic";
        trafficLanes[0] = trafficInfo;
        return true;
    }
    trafficInfo.durationInMinutes = 2;
    trafficInfo.information = "Low Traffic";
    trafficLanes[0] = trafficInfo;
    return true;
}
