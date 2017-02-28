var bookFinder = angular.module('bookFinder', ['ionic','ngCordova']);

var urlAmazon;

function compare(a,b) {
    if (a.title < b.title)
        return -1;
    if (a.title > b.title)
        return 1;
    return 0;
}



bookFinder.factory('Projects', function() {
    return {
        all: function() {
            var projectString = window.localStorage['projects'];
            if(projectString) {
                return angular.fromJson(projectString);
            }
            return [];
        },
        save: function(projects) {
            window.localStorage['projects'] = angular.toJson(projects);
        },
        newProject: function(projectTitle) {
            // Add a new project
            return {
                title: projectTitle
            };
        },
        getLastActiveIndex: function() {
            return parseInt(window.localStorage['lastActiveProject']) || 0;
        },
        setLastActiveIndex: function(index) {
            window.localStorage['lastActiveProject'] = index;
        }

    }
});



bookFinder.controller('TodoCtrl', function($scope, $timeout, $ionicModal, Projects, $ionicSideMenuDelegate, $cordovaInAppBrowser, $ionicPopup) {

    var createProject = function(projectTitle) {
        var newP = Projects.newProject(projectTitle);
        $scope.projects.push(newP);
        Projects.save($scope.projects);
        //$scope.selectProject(newP, $scope.projects.length-1);
    };


    // Load or initialize projects
    $scope.projects = Projects.all();




    // Called to create a new project
    $scope.newProj = function() {
        var projectTitle = $('#result').val();
        var testTitle = JSON.stringify(projectTitle);
        var already = false;
        for (var i in $scope.projects ) {
            
            if (testTitle.toUpperCase() === JSON.stringify($scope.projects[i].title).toUpperCase()) {
                already = true;
            }

        }
        if (!already){
            createProject(projectTitle);
        }
    };

    // Called to select the given project
    $scope.selectProject = function(project, index) {

        $scope.activeProject = project;
        Projects.setLastActiveIndex(index);
        //$scope.projects.sort(compare);
        var oldKW = $scope.activeProject.title;

        //alert(oldKW);

        $('#result').val(oldKW);
        //alert($('#result').val());
        get_book_amazon();
        $ionicSideMenuDelegate.toggleRight(); //set this to show the requested page(... .toggleLeft(false)to center)
    };

    $scope.removeItem = function (index) {
        $scope.projects.sort(compare);
    
        $scope.projects.splice(index, 1);
        Projects.save($scope.projects);
       

    };



    $scope.toggleSearchedBooks = function() { $ionicSideMenuDelegate.toggleLeft(); };


    $scope.toggleHome = function() { $ionicSideMenuDelegate.toggleLeft(false); };


     $scope.IfKWtoggleRight = function() {


        if(!(/\S/.test($('#result').val()))){

            alert("Please insert keyword");
        }
        else{
            $ionicSideMenuDelegate.toggleRight();
        }
     };
    
    $scope.toggleRightSideMenu = function() {

            $ionicSideMenuDelegate.toggleRight();
        
    };

    var optionsbrowser = {
        location: 'yes',
        clearcache: 'yes',
        toolbar: 'no'
    };

    $scope.openBrowser = function() {
        $cordovaInAppBrowser.open(urlAmazon, '_blank', optionsbrowser)

            .then(function(event) {
                // success
            })

            .catch(function(event) {
                // error
        });
    };

    $scope.showAlert = function() {
        $ionicPopup.alert(
            {
            title: 'How to use bookFinder v1.1.1',
            template: '1-Take Picture: use the phone camera to take a picture of the book cover(try to stay steady and get at least the title)' +'<br />'+
            '2-the text obtained from Google OCR will be displayed in the label between the buttons' +'<br />'+
            '3-Search Book',
             okType: 'button-energized'
            }
        );


    };

});

bookFinder.filter('searchContacts', function(){
    return function (items, query) {
        var filtered = [];
        var letterMatch = new RegExp(query, 'i');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (query) {
                if (letterMatch.test(item.title.substring(0, query.length))) {
                    filtered.push(item);
                }
            } else {
                filtered.push(item);
            }
        }
        return filtered;
    };
});




bookFinder.controller('HomeController', ['$scope', '$ionicModal', '$cordovaFile', '$cordovaFileTransfer', '$cordovaCamera', HomeController]);

function HomeController($scope, $ionicModal, $cordovaFile, $cordovaFileTransfer, $cordovaCamera){

    var me = this;
    me.current_image = 'img/books.jpeg'; //immg home
    me.image_description = '';
    me.detection_type = 'TEXT_DETECTION';  //default detection

    me.detection_types = {
        TEXT_DETECTION: 'text',
        LABEL_DETECTION: 'label',
        LOGO_DETECTION: 'logo',
        LANDMARK_DETECTION: 'landmark'
    };

    var api_key = ' '; //apikey google
    

    $scope.takePicture = function(){

        var options = {
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: Camera.PictureSourceType.CAMERA,
            allowEdit : true,
            popoverOptions: CameraPopoverOptions,
            correctOrientation: true,
            cameraDirection: 0,
            encodingType: Camera.EncodingType.JPEG,
            saveToPhotoAlbum: false
        };

        $cordovaCamera.getPicture(options).then(function(imagedata){

            me.current_image = "data:image/jpeg;base64," + imagedata;
            me.image_description = '';
            me.locale = '';
            

            var json = '{' +
                ' "requests": [' +
                '	{ ' +
                '	  "image": {' +
                '	    "content":"' + imagedata + '"' +
                '	  },' +
                '	  "features": [' +
                '	      {' +
                '	      	"type": "' + me.detection_type + '",' +
                '			"maxResults": 1' +
                '	      }' +
                '	  ]' +
                '	}' +
                ']' +
                '}';

            $.ajax({
                type: 'POST',
                url: "https://vision.googleapis.com/v1/images:annotate?key=" + api_key,
                dataType: 'json',
                data: json,
                //Include headers, otherwise you get an odd 400 error.
                headers: {
                    "Content-Type": "application/json"
                },

                success: function(result, textStatus, jqXHR) {
                    var res = result;//non è il risultato
                    var key = me.detection_types[me.detection_type] + 'Annotations';
                    //var resprova = JSON.stringify(res);
                    var desc = res.responses[0][key][0].description;
                    desc = desc.replace(/\n/g, " ");
                    me.image_description = desc;//questa è la risposta!!

                    document.getElementById("result").value = me.image_description;
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log('ERRORS: ' + textStatus + ' ' + errorThrown);
                }
            });
        }, function(err){
            alert('An error occurred getting the picture from the camera or you quit the camera');
        });
    }
}//funct homecontroller


$(document).ready(function() {
    $('#get_book_amazon').click(function () {
        get_book_amazon()
    });
});

var get_book_amazon = function() {

    $('#menu').empty();
    $('#menu').slideDown();
    
    document.getElementById("notList").style.display = "none";
    
    var keyword = $('#result').val();

    $('#book-title').text("searched for : "+keyword);
    
    var u = invokeRquestbykeyword(keyword);

    $.ajax({
        url: "http://query.yahooapis.com/v1/public/yql",     //bypassare cross origin https
        //async: false,
        data: {
            q: "select * from xml where url =\"" + u + "\"",
            format: "xml"
        },
        success: function(xml){
            
            //var text = new XMLSerializer().serializeToString(xml);
            //var listAmazon = xml.getElementsByTagName("Items")[0].getElementsByTagName("MoreSearchResultsUrl")[0].firstChild.nodeValue;

            $(xml).find('Item').each(function () {

                // CREATE AND ADD SUB LIST ITEMS.
                var id = $(this).find('ASIN').text();

                var sub_li = $('<li id=' + id + '/>')
                    .appendTo('#menu');
                /*
                var sub_li = $('<li/>')
                    .appendTo('#menu');
                    */

                var title = $(this).find('ItemAttributes').find('Title').text();
                var author = $(this).find('ItemAttributes').find('Author').eq(0).text();//eq 0 prende solo il primo autore!!
                var author2 = $(this).find('ItemAttributes').find('Author').eq(1).text();
                var author3 = $(this).find('ItemAttributes').find('Author').eq(2).text();

                //var link = $(this).find('ItemLink').find('URL').text();

                $('<a />')
                    .text(title)
                    .attr('href', '#')  //ogni book porta a questo
                    .appendTo(sub_li);

                $('<a />')
                    .text(author+" "+author2+ " "+author3)
                    .attr('href', '#')  //ogni book porta a questo
                    .appendTo(sub_li);
            });
        }
    });
};

$(document).ready(function() {
    $('#menu').on('click','li',function () {
        var ASIN = $(this).attr('id');
        convertertoISBN(ASIN);
        get_book_by_id(ASIN)
    });

});


function loadIframe(iframeName, url) {
    var $iframe = $('#' + iframeName);
    if ( $iframe.length ) {
        $iframe.attr('src',url);
        return false;
    }
    return true;
}

var get_book_by_id = function(ASIN) {

    var y = invokeRquestbyid(ASIN);
    loadIframe("frameDemo", " ");
    
    $(document).ready(function() {

        $('#menu').slideUp( "slow", function() {

            loadIframe("frameDemo", " ");

            document.getElementById("notList").style.display = "block";


            $.ajax({
                url: "http://query.yahooapis.com/v1/public/yql",     //bypassare cross origin https
                //async: false,
                data: {
                    q: "select * from xml where url =\"" + y + "\"",
                    format: "xml"
                },
                success: function(xml){

                        urlAmazon = $(xml).find('DetailPageURL').text();
                        var urlIframe = $(xml).find('IFrameURL').text();

                        //alert(urlIframe);

                        loadIframe("frameDemo", urlIframe);

                }
            });//ajax

        }); //slideUP

    });//ready

};


$(document).ready(function() {
    $('#back').click(function () {

        $('#menu').slideDown();
        document.getElementById("notList").style.display = "none";
    });
});


var convertertoISBN = function(ASIN){
    var aaa = "https://www.amazon.com/dp/"+ASIN;

    $.ajax({
        url: "https://query.yahooapis.com/v1/public/yql",
        data: {
            q: "select * from html where url =\"" + encodeURI(aaa) + "\""
        },
        success: function(response){
            li = response.getElementsByTagName("li");
            for(k in li){
                element = li[k].getElementsByTagName("b")[0];
                if (typeof(element) != 'undefined' && element != null && element.innerHTML == "ISBN-10:" ) {
                    li[k].removeChild(element);
                    ASIN = li[k].innerHTML;
                    //alert("ISBN"+ASIN);
                    break
                }
            }
        }
    });
};




