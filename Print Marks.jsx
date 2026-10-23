//CropMarks.jsx
//An InDesign JavaScript
/*  
@@@BUILDINFO@@@ "CropMarks.jsx" 3.0.0 15 December 2009
*/
//Draws crop and/or registration marks around the selected object or objects.
//
//For more on InDesign/InCopy scripting see the documentation included in the Scripting SDK 
//available at http://www.adobe.com/devnet/indesign/sdk.html
//or visit the InDesign Scripting User to User forum at http://www.adobeforums.com
//
main();
function main(){
	//Make certain that user interaction (display of dialogs, etc.) is turned on.
	app.scriptPreferences.userInteractionLevel = UserInteractionLevels.interactWithAll;
	if (app.documents.length != 0){
		myDisplayDialog();
	}
	else{
		alert("Please open a document, and try again.");
	}
}
function myDisplayDialog(){
	var myDialog = app.dialogs.add({name:"Print Marks"});
	with(myDialog){
		with(dialogColumns.add()){
			var myCollationMarksGroup = enablingGroups.add({staticLabel:"Collation Marks", checkedState:true});
			with(myCollationMarksGroup){
				with(borderPanels.add()){
					with(dialogColumns.add()){
						staticTexts.add({staticLabel:"Stroke width:"});
					}
					with(dialogColumns.add()){
						var myCollationMarkWidthField = measurementEditboxes.add({editValue:3, editUnits:MeasurementUnits.points});
					}
				}

				with(borderPanels.add()){
					staticTexts.add({staticLabel:"Add Marks To:"});
					var myRangeButtons = radiobuttonGroups.add();
					with(myRangeButtons){
						radiobuttonControls.add({staticLabel:"Odd Pages", checkedState:true})
						radiobuttonControls.add({staticLabel:"Even Pages"});
						radiobuttonControls.add({staticLabel:"All Pages"});
						radiobuttonControls.add({staticLabel:"Folded Eights"});
					}
				}
			}

			var labelsGroup = enablingGroups.add({staticLabel:"Press Sheet Labels", checkedState:true});
			with(labelsGroup){
				with(borderPanels.add()){
					with(dialogColumns.add()){
						staticTexts.add({staticLabel:"Text size:"});
					}
					with(dialogColumns.add()){
						var labelsPointSizeField = measurementEditboxes.add({editValue:10, editUnits:MeasurementUnits.points});
					}
				}
			}

			with(borderPanels.add()){
				staticTexts.add({staticLabel: "Color:"});
				var colorsList = [];
				for(var i = 0; i < app.activeDocument.swatches.length; i++) {
					var swatchName = app.activeDocument.swatches[i].name;
					colorsList.push(swatchName);
				}
				var swatchColorDropdown = dropdowns.add({stringList: colorsList, selectedIndex: 1});
			}
		}
	}
	var myReturn = myDialog.show();
	if (myReturn == true){
		//Get the values from the dialog box.
		var myDoCollationMarks = myCollationMarksGroup.checkedState;
		var myCollationMarkWidth = myCollationMarkWidthField.editValue;
		var myPageRange = myRangeButtons.selectedButton;
		var mySwatchColorIndex = swatchColorDropdown.selectedIndex;
		var doLabels = labelsGroup.checkedState;
		var labelPointSize = labelsPointSizeField.editValue;
		myDialog.destroy();
		//"||" is logical OR in JavaScript.
		if (((myDoCollationMarks != false || doLabels != false) && mySwatchColorIndex != -1)){
			myDrawPrintersMarks(myPageRange, myDoCollationMarks, myCollationMarkWidth, mySwatchColorIndex, doLabels, labelPointSize);
		}
		else{
			alert("No printers marks were selected.");
		}
	}
	else{
		myDialog.destroy();
	}
}
function myDrawPrintersMarks(myPageRange, myDoCollationMarks, myCollationMarkWidth, mySwatchColorIndex, doLabels, labelPointSize){
	var myBounds, myX1, myY1, myX2, myY2, myObject;
	var myDocument = app.activeDocument;
	var myOldRulerOrigin = myDocument.viewPreferences.rulerOrigin;
	myDocument.viewPreferences.rulerOrigin = RulerOrigin.spreadOrigin;
	//Save the current measurement units.
	var myOldXUnits = myDocument.viewPreferences.horizontalMeasurementUnits;
	var myOldYUnits = myDocument.viewPreferences.verticalMeasurementUnits;
	//Set the measurement units to points.
	myDocument.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.points;
	myDocument.viewPreferences.verticalMeasurementUnits = MeasurementUnits.points;
	//Save the old page numbering
    var myOldPageNumbering = app.generalPreferences.pageNumbering;
    app.generalPreferences.pageNumbering = PageNumberingOptions.section;
    //Set page numbering to absolute
    app.generalPreferences.pageNumbering = PageNumberingOptions.absolute;
    //Does the document start with an even page?
    if(myCheckPageStart(app.activeDocument) == false){
        myPageAdjust = 1;
    }
    else{
        myPageAdjust = 0;
    }
    //Set to non facing pages
	var oldFacingPages = myDocument.documentPreferences.facingPages;
	myDocument.documentPreferences.facingPages = false;

    
	//Create a layer to hold the printers marks (if it does not already exist).
	var myLayer = myDocument.layers.item("Print Marks");
	try{
		myLayerName = myLayer.name;
	}
	catch (myError){
		var myLayer = myDocument.layers.add({name:"Print Marks"});
	}
	//Get references to the Registration color and the None swatch.
	var myRegistrationColor = myDocument.colors.item("Registration");
	var myNoneSwatch = myDocument.swatches.item("None");
	var mySelectedSwatch = myDocument.swatches[mySwatchColorIndex];

	myBounds = myDocument.pages[0].bounds;
	if (myDoCollationMarks) {
		myDrawCollationMarks(myBounds[1], myBounds[0], myBounds[3], myBounds[2], myCollationMarkWidth, myPageRange, mySelectedSwatch, myNoneSwatch, myLayer);	
	}

	if (doLabels) {
		drawLabels(myBounds[1], myBounds[0], myBounds[3], myBounds[2], labelPointSize, mySelectedSwatch, myNoneSwatch, myLayer)
	}

    app.generalPreferences.pageNumbering = myOldPageNumbering;
	myDocument.documentPreferences.facingPages = oldFacingPages;
	myDocument.viewPreferences.rulerOrigin = myOldRulerOrigin;
	//Set the measurement units back to their original state.
	myDocument.viewPreferences.horizontalMeasurementUnits = myOldXUnits;
	myDocument.viewPreferences.verticalMeasurementUnits = myOldYUnits;
}

function drawLabels(myX1, myY1, myX2, myY2, labelPointSize, mySelectedSwatch, myNoneSwatch, myLayer) {
	var myPage = app.activeDocument.pages.item(0);
	var myMarginPreferences = myPage.marginPreferences; 
	var myLeftMargin = myMarginPreferences.left;  
	var myTopMargin = myMarginPreferences.top;  
	var myRightMargin = myMarginPreferences.right;  
	var myBottomMargin = myMarginPreferences.bottom;

	for(var i = 0; i < app.activeDocument.pages.length; i++){
		var page = app.activeDocument.pages.item(i);
        app.activeDocument.pages.item(i).select();
        var labelContents = SpecialCharacters.autoPageNumber;
        var options = {
        	geometricBounds:[myY2 - myBottomMargin - labelPointSize, myLeftMargin, myY2 - myBottomMargin, myX2 - myRightMargin
        		], 
        	contents: labelContents};

        var textFrame = page.textFrames.add(myLayer, undefined, undefined, options)
        textFrame.contents = "press sheet #" + textFrame.contents;
        textFrame.paragraphs[0].pointSize = labelPointSize;
        textFrame.paragraphs[0].fillColor = mySelectedSwatch;
        textFrame.select();
    }
}

function myDrawCollationMarks(myX1, myY1, myX2, myY2, myCollationMarkWidth, myPageRange, myRegistrationColor, myNoneSwatch, myLayer) {
	var numBars = app.activeDocument.pages.length / 2;
	var pageInterval = 2 
	var pageAdjust = 0;
    var x = (myX2 - myX1) / 2;
	var length;

	switch(myPageRange){
		case 0:
			// rectos 
			break;
		case 1:
			// versos 
			pageAdjust = 1;
			break;
		case 2:
			// all pages
			numBars = app.activeDocument.pages.length;
			pageInterval = 1;
			break;
		case 3:
			// folded 8s
			myY2 = myY2 / 2;
			break;
	}


    length = (myY2 - myY1) / numBars;

	for(var i = 0; i < numBars; i++){
        app.activeDocument.pages.item(i * pageInterval + pageAdjust).select();
        
        var y1 = i * length;
        var y2 = (i + 1) * length;

		myDrawLine([y1, x, y2, x], myCollationMarkWidth, myRegistrationColor, myNoneSwatch, myLayer);
    }
}



function myDrawLine(myBounds, myStrokeWeight, myRegistrationColor, myNoneSwatch, myLayer){
	app.activeWindow.activeSpread.graphicLines.add(myLayer, undefined, undefined,{strokeWeight:myStrokeWeight, fillColor:myNoneSwatch, strokeColor:myRegistrationColor, geometricBounds:myBounds})
}
function myDrawTarget(myBounds, myStrokeWeight, myRegistrationColor, myNoneSwatch, myLayer){
	app.activeWindow.activeSpread.ovals.add(myLayer, undefined, undefined, {strokeWeight:myStrokeWeight, fillColor:myNoneSwatch, strokeColor:myRegistrationColor, geometricBounds:myBounds})
}

function myCheckPageStart(myDocument){
    var mySection = myDocument.sections.item(0);
    if(mySection.continueNumbering == true){
        //Starting page number is defined by other documents in the book
        return true;
    }
    if(mySection.pageNumberStart % 2 == 0){
        //Starting page number is an even page.
        return false;
    }
    else{
        //Starting page number is an odd page.
        return true;
    }
}