var NUM_PALETTES = 9;
var SEISMOMETER_DATA_SERVER = "http://californiareportcard.org/naturalFrequencies/naturalFrequencies.py";
var NUM_RINGS_PER_BLOOM = 5; // 16

//LOAD COLOR PALETTES


var contexts = [];

for (k = 1; k < NUM_PALETTES + 1; k++) {
    var canvas = document.getElementById('viewport' + k);
    var context = canvas.getContext('2d');
    contexts.push(context);
    var fileName = 'palette' + k + '.jpg';
    make_img(fileName, context);
}

function make_img(fileName, context) {
    var img = new Image();
    img.src = fileName;
    img.onload = function() {context.drawImage(img, 0, 0)};
}





//PROCESS DATA

var a = [726, 891, 664, 37, 152, 273, 456, 787, 881, 509, 257, 470, 517, 734, 568, 557, 876, 876, 260, 193, 491, 166, 289, 830, 524, 408, 380, 266, 872, 590, 485, 611, 656, 354, 107, 758, 251, 346, 430, 236, 336, 294, 844, 497, 676, 85, 715, 852, 729, 108, 491, 630, 236, 481, 149, 527, 519, 113, 429, 327, 308, 575, 381, 420, 558, 631, 679, 609, 690, 689, 95, 479, 863, 485, 98, 768, 155, 516, 860, 287, 660, 24, 177, 700, 788, 673, 64, 459, 366, 83, 239, 33, 463, 603, 276, 176, 305, 824, 147, 842, 440, 393, 257, 439, 774, 779, 463, 388, 450, 512, 525, 677, 598, 43, 670, 387, 27, 168, 648, 18, 423, 650, 676, 585, 462, 314, 293, 770, 861, 295, 768, 286, 464, 257, 621, 25, 415, 54, 547, 230, 146, 99, 718, 871, 827, 502, 64, 558, 249, 78, 491, 17, 352, 518, 405, 69, 447, 807, 20, 132, 757, 46, 245, 423, 570, 791, 448, 791, 331, 569, 42, 823, 592, 576, 697, 762, 837, 420, 337, 321, 723, 841, 683, 487, 867, 341, 83, 75, 494, 346, 547, 115, 103, 47, 507, 622, 693, 371, 500, 150, 17, 526, 274, 203, 182, 727, 705, 16, 778, 893, 330, 422, 161, 409, 266, 742, 861, 227, 459, 468, 402, 238, 274, 631, 734, 146, 819, 153, 693, 154, 719, 160, 716, 430, 385, 540, 136, 499, 336, 151, 50, 46, 773, 333, 758, 154, 606, 460, 23, 332, 475, 378, 469, 373, 274, 729, 179, 597, 13, 25, 850, 29, 742, 707, 151, 222, 862, 164, 636, 577, 677, 424, 862, 419, 283, 203, 826, 196, 31, 237, 44, 6, 843, 783, 430, 645, 294, 358, 250, 830, 402, 81, 761, 443, 316, 485, 95, 637, 407, 741, 346, 539, 222, 482, 898, 258, 187, 299, 510, 633, 82, 108, 633, 646, 125, 20, 215, 562, 891, 777, 625, 30, 443, 196, 248, 23, 469, 295, 319, 329, 27, 885, 864, 686, 47, 768, 687, 601, 422, 430, 685, 391, 786, 876, 678, 626, 176, 50, 899, 489, 363, 799, 810, 180, 560, 716, 105, 850, 81, 248, 174, 707, 779, 125, 564, 695, 565, 359, 560, 353, 320, 279, 553, 153, 635, 442, 290, 229, 661, 752, 57, 896, 116, 70, 33, 170, 295, 101, 344, 683, 789, 321, 286, 101, 210, 374, 335, 227, 167, 421, 172, 716, 424, 180, 857, 886, 572, 209, 467, 481, 674, 2, 386, 235, 769, 294, 354, 518, 685, 862, 589, 545, 110, 437, 284, 732, 880, 856, 357, 355, 657, 427, 670, 39, 399, 107, 792, 830, 517, 588, 270, 562, 37, 125, 5, 384, 734, 479, 394, 246, 135, 808, 522, 873, 483, 434, 592, 375, 349, 415, 362, 346, 190, 71, 866, 780, 257, 359, 474, 211, 528, 898, 685, 855, 421, 826, 784, 587, 446, 489, 325, 366, 730, 496, 656, 793, 79, 143, 570, 532, 118, 796, 64, 43, 98, 336, 396, 77, 96, 116, 349, 78, 19, 414, 203, 42, 887, 790, 158, 358, 489, 109, 893, 542, 543, 474, 72, 898, 14, 569, 791, 632, 426, 656, 487, 342, 43, 241, 259, 459, 672, 24, 655, 342, 823, 391, 326, 302, 180, 555, 234, 797, 747, 608, 366, 128, 142, 253, 552, 872, 704, 782, 113, 325, 418, 752, 847, 508, 667, 648, 5, 50, 717, 179, 403, 533, 36, 325, 688, 540, 491, 617, 691, 465, 14, 475, 215, 725, 694, 776, 196, 451, 26, 662, 218, 476, 5, 257, 272, 590, 536, 763, 654, 813, 843, 604, 341, 123, 283, 654, 315, 826, 113, 395, 867, 659, 18, 567, 148, 177, 785, 304, 843, 502, 842, 700, 477, 622, 77, 16, 178, 306, 101, 104, 717, 642, 62, 189, 732, 591, 757, 783, 421, 507, 782, 571, 168, 521, 702, 257, 8, 766, 570, 322, 638, 308, 148, 347, 331, 338, 645, 438, 55, 474, 211, 41, 17, 238, 577, 438, 768, 825, 336, 418, 333, 559, 804, 456, 779, 164, 302, 504, 866, 457, 737, 260, 816, 182, 884, 738, 448, 875, 114, 591, 494, 857, 130, 274, 430, 158, 590, 502, 263, 681, 588, 98, 533, 67, 613, 68, 680, 230, 188, 498, 606, 790, 569, 348, 829, 524, 117, 374, 653, 861, 147, 189, 832, 611, 556, 805, 546, 535, 489, 122, 187, 893, 236, 803, 102, 468, 317, 346, 420, 885, 733, 248, 678, 894, 751, 556, 199, 493, 347, 230, 305, 614, 419, 86, 723, 634, 422, 867, 55, 56, 277, 291, 415, 869, 804, 324, 273, 601, 361, 116, 655, 503, 124, 97, 415, 288, 57, 115, 728, 435, 442, 564, 437, 192, 565, 380, 247, 504, 869, 53, 276, 62, 819, 135, 726, 278, 624, 47, 699, 530, 811, 166, 261, 732, 193, 704, 35, 90, 592, 701, 277, 171, 81, 448, 360, 54, 255, 612, 584, 206, 605, 97, 159, 271, 99, 256, 81, 461, 562, 104, 564, 437, 225, 564, 325, 304, 689, 80, 652, 855, 339, 136, 689, 828, 182, 138, 486, 342, 19, 889, 56, 196, 501, 425, 270, 618, 37, 508, 769, 678, 288, 294, 471, 856, 390, 388, 129, 295, 240, 203, 653, 283, 475, 704, 451, 828, 647, 850, 288, 528, 641, 3, 179, 282, 465, 335, 437, 749, 80, 84, 125, 674, 142, 287, 375, 758, 722, 24, 570, 187, 303, 28, 631, 345, 44, 372, 636, 533, 447, 187, 719, 638, 832, 733, 564, 452, 51, 37, 388, 166, 760, 141, 193, 323, 391, 688, 298, 36, 748, 78, 764, 463, 535, 489, 843, 463, 605, 320, 83, 204, 67, 237, 517, 784, 894, 672, 699, 446, 189, 247, 826, 843, 795, 384, 795, 131, 429, 896, 464, 46, 839, 351, 771, 62, 499, 455, 49, 825, 702, 459, 744, 308, 614, 122, 503, 155, 179, 799, 247, 284, 758, 321, 606, 875, 674, 724, 290, 265, 451, 339, 109, 192, 833, 442, 878, 845, 281, 540, 462, 330, 691, 234, 100, 1, 213, 754, 0];
var b = a.slice(0, 30);

//Get seismometer data from server; polls it every 250ms
function poll() {
    $.ajax({
        url: SEISMOMETER_DATA_SERVER,
        type: "GET",
        success: function(data) {
            console.log(data);
            processData(data.z);
        },
        error: function() {
            // console.log("hi");
            processData(a);
            // console.log("bye");
        },
        dataType: "json",
        xhrFields: {
            withCredentials: true
        },
        headers: {
        },
        crossDomain: true,
        complete: setTimeout(function() {poll()}, 250),
        timeout: 250
    });
}
poll();


var time = 1; //Our current location in the array of smoothed data points. Used for determining x-coordinate/time.
var smoothedData = [];
var lastRawData = [0, 0, 0]; //for simplicity use 3 dummy data points of 0's in the beginning

function processData(data) {
    smoothedData.push(0.25 * lastRawData[0] + 0.25 * lastRawData[1] + 0.25 * lastRawData[2] + 0.25 * data[0]);
    smoothedData.push(0.25 * lastRawData[1] + 0.25 * lastRawData[2] + 0.25 * data[0] + 0.25 * data[1]);
    smoothedData.push(0.25 * lastRawData[2] + 0.25 * data[0] + 0.25 * data[1] + 0.25 * data[2]);
    for (i = 0; i < data.length - 3; i++) {
        smoothedData.push(0.25 * data[i] + 0.25 * data[i + 1] + 0.25 * data[i + 2] + 0.25 * data[i + 3]);
    }
    lastRawData[2] = data[data.length - 1];
    lastRawData[1] = data[data.length - 2];
    lastRawData[0] = data[data.length - 3];
}






var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");


//var canvas = document.createElement("canvas");
//var ctx = canvas.getContext("2d");
//canvas.width = actual_canvas.width;
//canvas.height = actual_canvas.height;

//
// MAIN
//

var circle_array = new Array();

var count = 0;

var _args = {};
var yimmy = yimmy || (function(){
    return {
        init : function(Args) {
            // Acquire args from HTML if necessary
            _args = Args;
        },
        start : function(){
            // processData(a);
            processData(b);
            setInterval(update2, 300); //was 600; 300 currently
            main();
            // BEGIN LOOP
            (function() {
                var requestAnimationFrame = window.requestAnimationFrame || 
                                            window.mozRequestAnimationFrame || 
                                            window.webkitRequestAnimationFrame || 
                                            window.msRequestAnimationFrame;
                window.requestAnimationFrame = requestAnimationFrame;
            })();
        }
    };
}());


var counter = 0; //Number of blooms we've created so far; needed to keep track of the blooms

function update2() {
    var diff1 = smoothedData[time] - smoothedData[time - 1];
    var diff2 = smoothedData[time] - smoothedData[time + 1];
    var product = diff1 * diff2;

    if (product > 0) {
        createBloom(counter.toString(), time);
        counter = counter + 1;
    }
    time++;
}




function mod(n, m) {
    return ((n % m) + m) % m;
}

//Default expected window size
var windowWidth = 1920;
var windowHeight = 1080;

function createBloom(counter, iParam) {

    
    windowHeight = canvas.height;
    windowWidth = canvas.width;
    var svgW = windowWidth;
    var svgH = windowHeight;
    

    var numRings = NUM_RINGS_PER_BLOOM;

    numRings = Math.floor((10 + Math.abs(smoothedData[iParam] / 10)) / 10);

    //Assume time differences between sensor readings are uniform
    var firstDerivative1 = smoothedData[iParam] - smoothedData[iParam - 1];
    var firstDerivative2 = smoothedData[iParam + 1] - smoothedData[iParam];
    //Y position of bloom  = second derivative scaled by some constant
    var secondDerivative = firstDerivative2 - firstDerivative1;
    //X position of bloom; change constant to modify ratio of time ticks to movement in x axis on screen
    var x = (time / 3) * 300 % svgW;
    x = getRandomInt(0, svgW);

    var randomPaletteIndex = getRandomInt(0, NUM_PALETTES);
    randomPaletteIndex = NUM_PALETTES - 1;
    var randomContext = contexts[randomPaletteIndex];

    var colors = [];

    var w = getImgWidth(randomPaletteIndex);
    var h = getImgHeight(randomPaletteIndex);
    var randomX = getRandomInt(0, w);
    var randomY = getRandomInt(0, h);

    for (i = 0; i < numRings; i++) {
        randomX = mod((randomX - getRandomInt(0, Math.floor(w / 3))), w);
        randomY = mod((randomY - getRandomInt(0, Math.floor(h / 3))), h); 
        var pixelData = randomContext.getImageData(randomX, randomY, 1, 1).data;
        while (!isColorValid(pixelData[0], pixelData[1], pixelData[2])) {
            randomX = mod((randomX - getRandomInt(0, Math.floor(w / 3))), w);
            randomY = mod((randomY - getRandomInt(0, Math.floor(h / 3))), h); 
            pixelData = randomContext.getImageData(randomX, randomY, 1, 1).data;
        }
        colors.push(rgb2hsv(pixelData[0], pixelData[1], pixelData[2]));
    }

    colors.sort(sortByHue);
    for (i = 0; i < colors.length; i++) {
        colors[i] = {
            h: colors[i].h,
            s: Math.floor(colors[i].s + 50, 100),
            v: colors[i].v
        };
    }

    var rgbColors = [];
    for (i = 0; i < colors.length; i++) {
        rgbColors.push(HSVtoRGB(colors[i]));
    }

    var init_r = 10;

    var y = Math.abs(secondDerivative) * 3 % svgH; //maybe I should change this?
    var i = numRings;
    
    /*
    need to fix the g_circle_t
    */
    var max_radius = init_r + Math.abs(smoothedData[iParam] / 10);

    circle_array.push(new g_circle_t(counter, 1 - ((Math.floor((numRings - 1 - i) / 3)) + 1) / 3 * 0.5 , (numRings - 1 - i) * 12 + Math.floor((numRings - 1 - i) / 3) * 16, x, y, init_r, init_r + max_radius * (2 * i/3 + 1 + ((numRings - 1) / 3)) / numRings, rgbColors[i-1].r, rgbColors[i-1].g, rgbColors[i-1].b, max_radius * 2, 1));


    var radius_of_largest_ring = (init_r + max_radius * (2 * (numRings -1)/3 + 1 + ((numRings - 1) / 3)) / numRings) * Math.log(21.5);
    x = Math.min(svgW - radius_of_largest_ring, Math.max(x, radius_of_largest_ring));
    y = Math.min(svgH - radius_of_largest_ring, Math.max(y, radius_of_largest_ring));


    //g_circle.max_r * Math.log(21.5)

    for (i = numRings - 1; i >= 0; i--) {
        
        
        /* fifth argument in the constructor for g_circle_t (which determines the maximum size of the bloom) as well as the last argument (which determines
            how long it takes the bloom to reach its maximum size) are subject to tweaking; current constants seem to be a good balance
        */
        
        
        
        circle_array.push(new g_circle_t(counter, 1 - ((Math.floor((numRings - 1 - i) / 3)) + 1) / 3 * 0.5 , (numRings - 1 - i) * 12 + Math.floor((numRings - 1 - i) / 3) * 16 * 0, x, y, init_r, init_r + max_radius * 2 * (2 * (i*0.1)/3 + 1 + ((numRings - 1) / 3)) / numRings, rgbColors[i].r, rgbColors[i].g, rgbColors[i].b, max_radius * 2, 0));
        /*
        if (i == numRings - 1) {
            circle_array.push(new g_circle_t(counter, 1 - ((Math.floor((numRings - 1 - i) / 3)) + 1) / 3 * 0.5 , (numRings - 1 - i) * 12 + Math.floor((numRings - 1 - i) / 3) * 16, x, y, init_r, init_r + max_radius * (2 * i/3 + 1 + ((numRings - 1) / 3)) / numRings, rgbColors[i].r, rgbColors[i].g, rgbColors[i].b, max_radius * 2, 1));
        } else {
            circle_array.push(new g_circle_t(counter, 1 - ((Math.floor((numRings - 1 - i) / 3)) + 1) / 3 * 0.5 , (numRings - 1 - i) * 12 + Math.floor((numRings - 1 - i) / 3) * 16, x, y, init_r, init_r + max_radius * (2 * i/3 + 1 + ((numRings - 1) / 3)) / numRings, rgbColors[i].r, rgbColors[i].g, rgbColors[i].b, max_radius * 2, 0));
        }
        */
        
    }

}









function sortByHue(hsvColor1, hsvColor2) {
    return hsvColor1.h - hsvColor2.h;
}

function getImgWidth(number) {
    switch(number) {
        case 0: return 176;
        case 1: return 252;
        case 2: return 267;
        case 3: return 485;
        case 4: return 297;
        case 5: return 272;
        case 6: return 276;
        case 7: return 274;
        case 8: return 472;
    }
}

function getImgHeight(number) {
    switch(number) {
        case 0: return 256;
        case 1: return 212;
        case 2: return 326;
        case 3: return 300;
        case 4: return 326;
        case 5: return 326;
        case 6: return 326;
        case 7: return 326;
        case 8: return 488;
    }
}


function isColorValid(r, g, b) {
    var isWhite = r > 200 && g > 200 && b > 200;
    var isBlack = r < 70 && g < 70 && b < 70;
    var isGray = Math.abs(r - g) < 40 && Math.abs(r - b) < 40 && Math.abs(g - b) < 40;
    if (isWhite || isBlack || isGray) {
        return false;
    } else {
        return true;
    }

}

//Utility functions taken mostly from stackoverflow

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function rgb2hsv () {
    var rr, gg, bb,
        r = arguments[0] / 255,
        g = arguments[1] / 255,
        b = arguments[2] / 255,
        h, s,
        v = Math.max(r, g, b),
        diff = v - Math.min(r, g, b),
        diffc = function(c){
            return (v - c) / 6 / diff + 1 / 2;
        };

    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(r);
        gg = diffc(g);
        bb = diffc(b);

        if (r === v) {
            h = bb - gg;
        }else if (g === v) {
            h = (1 / 3) + rr - bb;
        }else if (b === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        v: Math.round(v * 100)
    };
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    h = h / 360.0;
    s = s / 100.0;
    v = v / 100.0;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}










function main(){
    // main is called immediately when the function begins
    // Write all initialization functions here //

    window.addEventListener("load", function(){
        //console.log("starting");
        update();
    });
}


//
// UPDATE LOOP
//

function update(){
    resize_canvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < circle_array.length; i++){
        update_circle_state(circle_array[i]);
    }
    //actual_ctx.fillRect(0, 0, actual_canvas.width, actual_canvas.height);
    //actual_ctx.drawImage(canvas, 0, 0);
    
    requestAnimationFrame(update);
}



function g_circle_t(counter, opacity, wait, x, y, min_r, max_r, red, green, blue, max_time, invisflag){
    // Center coordinates of the circle
    this.id = counter;

    this.x = x;
    this.y = y;

    this.invisflag = invisflag;

    this.opacity = opacity;

    /*
    // Speed of the growth of the circle by [rad/sec]
    this.speed = 3;
    */
    this.time = 0;
    this.max_time = max_time;

    // Radius of the circle
    this.max_r = max_r;
    this.r = 300;
    this.min_r = min_r;
    
    


    // Max radius of the circle before it starts shrinking
    

    this.is_fading_away = false;

    this.red = red;
    this.green = green;
    this.blue = blue;

    var radgrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    radgrad.addColorStop(0, 'rgba(' + this.red.toString() + ',' + this.green.toString() + ',' + this.blue.toString() + ',1)');
    radgrad.addColorStop(0.8, 'rgba(' + this.red.toString() + ',' + this.green.toString() + ',' + this.blue.toString() + ',1)');
    radgrad.addColorStop(1, 'rgba(' + this.red.toString() + ',' + this.green.toString() + ',' + this.blue.toString() + ',' + '0' + ')');
    
    radgrad = 'rgba(' + this.red.toString() + ',' + this.green.toString() + ',' + this.blue.toString() + ',1)';

    this.gradient = radgrad;

    this.wait = wait;

    this.lineWidth = this.max_r / 12;
}


function g_circle_draw(g_circle){

    ctx.beginPath();

    ctx.arc(g_circle.x, g_circle.y, g_circle.r, 0, 2*Math.PI, false);
    
    ctx.fillStyle = g_circle.gradient;
    ctx.strokeStyle = g_circle.gradient;
    // ctx.fill();
    ctx.lineWidth = g_circle.lineWidth;
    ctx.stroke();
}

function update_circle_state(g_circle){
    if (g_circle.wait <= 0) {
        var radgrad = ctx.createRadialGradient(g_circle.x, g_circle.y, 0, g_circle.x, g_circle.y, g_circle.r);
        if (g_circle.is_fading_away) {
            if (g_circle.time >= 2 * g_circle.max_time) {
                for (var i = circle_array.length - 1; i >= 0; i--) {
                    if (circle_array[i].id == g_circle.id) {
                        circle_array.splice(i, 1);
                        return;
                    }
                }
                return;
            } else {
                var blur = 1 - ((g_circle.time - g_circle.max_time)/ (1 * g_circle.max_time));
                if (blur < 0) {
                    blur = 0;
                }
                blur = 0;
                radgrad.addColorStop(0, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')');
                radgrad.addColorStop(0.8, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')');
                radgrad.addColorStop(0.85, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')');
                radgrad.addColorStop(0.9, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')');
                radgrad.addColorStop(0.95, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')');
                radgrad.addColorStop(1, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')');

                g_circle.gradient = 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')';
                if (g_circle.invisflag == 1) {
                    g_circle.gradient = 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + '0' + ')';
                }
            }
        } else {
            if (g_circle.time >= g_circle.max_time) {
                g_circle.is_fading_away = true;
                //change this later

            }
            //also speed in beginning might be too high? because of the way it goes from 10 to the next size?
            //I think the speed needs to slow down less, and the speed of subsequent rings needs to slow down even more because of compression
            //tried to use sqrt, didn't work...? lol
            g_circle.lineWidth += 0.05;
            g_circle.r = g_circle.max_r * Math.log(1.5 + (g_circle.time / g_circle.max_time) * 20); // 1 + g_circle.time / 5
            radgrad.addColorStop(0, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',1)');
            radgrad.addColorStop(0.8, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',1)');
            var blur = g_circle.time / g_circle.max_time;
            blur = (1 - (g_circle.time / g_circle.max_time)) * g_circle.opacity;
            radgrad.addColorStop(1, 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')');

            g_circle.gradient = 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + blur.toString() + ')';
            if (g_circle.invisflag == 1) {
                g_circle.gradient = 'rgba(' + g_circle.red.toString() + ',' + g_circle.green.toString() + ',' + g_circle.blue.toString() + ',' + '0' + ')';
            }
            
        }
        g_circle_draw(g_circle);
        //g_circle.gradient = radgrad;
        g_circle.time++;
    } else {
        g_circle.wait -= 1;
    }


}


//
// UTILITY FUNCTIONS
//


function resize_canvas(){
    if (canvas.width != window.innerWidth) {
        canvas.width = window.innerWidth;
    }
    if (canvas.height != window.innerHeight) {
        canvas.height = window.innerHeight;
    }
}
