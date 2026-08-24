var featuredSkills = [];
var currentFeaturedIndex = 0;

async function initMain(){
    featuredSkills = [];
    for (var i=0; i<(jsonData.featured || []).length; i++) {
        try { featuredSkills.push(await PortfolioResources.loadSkill(jsonData.featured[i])); }
        catch(e) { console.error('Unable to load featured skill', jsonData.featured[i], e); }
    }

    var indicators=$('#featuredIndicators').empty(), slides=$('#featuredSlides').empty();
    for(var index=0;index<featuredSkills.length;index++){
        var skill=featuredSkills[index];
        var feature=skill.featured || {};
        indicators.append($('<li>',{'data-target':'#myCarousel','data-slide-to':index,'class':index===0?'active':''}));
        var item=$('<div>',{'class':'item'+(index===0?' active':''),'data-feature-index':index});
        item.append($('<img>',{src:PortfolioResources.asset(feature.heroImage,skill._resourceBase),alt:feature.overlayTitle || skill.title}).css('width','100%'));
        var caption=$('<div>',{'class':'carousel-caption'}).append($('<h3>').text(feature.overlayTitle || skill.title));
        caption.append(document.createTextNode(feature.overlayText || skill.subtitle || ''));
        item.append(caption); slides.append(item);
    }

    function showFeature(index){
        currentFeaturedIndex=index;
        var skill=featuredSkills[index]; if(!skill) return;
        var feature=skill.featured || {};
        $('#Description_sm,#Description_lg').text(feature.description || skill.text || '');
        var support=$('#featuredSupporting').empty();
        for(var i=0;i<(feature.supportingImages || []).length;i++){
            var imgPath=feature.supportingImages[i];
            var imgUrl=PortfolioResources.asset(imgPath,skill._resourceBase);
            var col=$('<div>',{'class':'col-md-12'}), thumb=$('<div>',{'class':'thumbnail'}), a=$('<a>',{href:imgUrl,target:'_blank'});
            a.append($('<img>',{src:imgUrl,alt:(skill.title+' supporting image '+(i+1))}).css('width','100%'));
            thumb.append(a); col.append(thumb); support.append(col); col.find('img').animateCss('rubberBand');
        }
        $('#featuredReadMore').off('click').on('click',function(e){e.preventDefault(); openFeaturedSkill(skill._ref);});
    }

    $('#myCarousel').off('slide.bs.carousel').on('slide.bs.carousel',function(e){ showFeature(parseInt($(e.relatedTarget).attr('data-feature-index'),10)||0); });
    showFeature(0);
    $('.carousel').carousel({interval:5000});
}
