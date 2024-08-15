/**
 * D3 Module
 * Creates a visualization from the CSV data
 *
 * @author Ashiqur Rahman
 * @author_url http://ashiqur.com
 **/

import * as d3 from "https://cdn.skypack.dev/d3@7";

// Define the global variables for the visualization
let categories, papers, entities, nouns, renders, x_variable = 'MPG',
    y_variable = 'Horsepower', cars_color, attributes, axis_keys;
let paper_groups = [], paper_categories = [], paper_titles = [], paper_authors = [], paper_years = []

let box_cutoffs = [0, 0, 0, 0];

let default_filter = {
    'min_mpg': 0,
}

// Active filters at any point of time
let active_filter = {...default_filter};

/**
 * Window is ready, let's go...
 */
window.onload = function () {
    load_data();
};

/**
 * Load the data from the CSV file
 * @param type
 */
function load_data(type) {
    Promise.all([
        d3.csv("resources/data/categories.csv"),
        d3.csv("resources/data/ndi_papers.csv")
    ]).then(createVisualization);

    d3.select('#show-what').on('change', function () {
        show_what = d3.select('#show-what').property('checked');
        redraw_visualization();
    });

    d3.select('#reset-button').on('click', function () {
        redraw_visualization();
    });
}

/**
 * Function to create the visualization
 * This function cleans up the data, creates the dropdowns for the axis, color legends and hands over the data to the draw function
 * @param data array of CSV data elements
 */
function createVisualization(data) {

    categories = data[0];
    papers = data[1];

    // Parse the data to create individual lists of entities
    papers.forEach((d, index) => {

        // Groups of paper
        let groups = d['Labels filed in'].trim().split(';');
        groups.forEach(g => {
            if (!['NDI', 'To Summarize', 'Image Segmentation'].includes(g)) {
                let found_g = false;
                categories.forEach((c, i) => {
                    if (c['Subcategory'].includes(g)) {
                        // Get the paper categories

                        let found_paper_group = false;

                        paper_groups.forEach((pg, pi) => {
                            if (pg['group'] === c['Category']) {
                                pg['paper_index'].push(index);
                                found_paper_group = true;
                            }
                        }, index);

                        if (!found_paper_group) {
                            paper_groups.push({
                                'group': c['Category'],
                                'paper_index': [index]
                            });
                        }

                        // Get the paper sub categories

                        let found_paper_category = false;

                        paper_categories.forEach((pc, pi) => {
                            if (pc['category'] === c['Subcategory']) {
                                pc['paper_index'].push(index);
                                found_paper_category = true;
                            }
                        }, index);

                        if (!found_paper_category) {
                            paper_categories.push({
                                'category': c['Subcategory'],
                                'paper_index': [index]
                            });
                        }

                        found_g = true;
                    }
                });

                if (!found_g) {
                    console.log('Group not found: ' + g);
                }
            }
        });

        // Authors of the paper
        let authors = eval(d['Authors']);
        authors.forEach(a => {

            let found_paper_author = false;

            paper_authors.forEach((pa, pi) => {
                if (pa['author'] === a.trim()) {
                    pa['paper_index'].push(index);
                    found_paper_author = true;
                }
            }, index);

            paper_authors.push({
                'author': a.trim(),
                'paper_index': [index]
            });
        });

        // Titles of the paper
        let title = d['Title'].trim();
        paper_titles.push({
            'title': title,
            'paper_index': [index]
        });

        // Years of the paper
        let year = d['Publication year'].trim();
        let found_paper_year = false;

        paper_years.forEach((py, pi) => {
            if (py['year'] === year) {
                py['paper_index'].push(index);
                found_paper_year = true;
            }
        }, index);

        if (!found_paper_year) {
            paper_years.push({
                'year': year,
                'paper_index': [index]
            });
        }
    });

    paper_groups.sort((a, b) => a.group.localeCompare(b.group));
    paper_categories.sort((a, b) => a.category.localeCompare(b.category));
    paper_authors.sort((a, b) => a.author.localeCompare(b.author));
    paper_titles.sort((a, b) => a.title.localeCompare(b.title));
    paper_years.sort((a, b) => a.year.localeCompare(b.year));

    // Attributes of the SVG visualization
    attributes = {
        width_svg: 1200,
        height_svg: (d3.max([paper_groups.length, paper_categories.length, paper_titles.length, paper_authors.length, paper_years.length]) * 20 + 40),
        margin: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        },
        axis: {
            x: 50,
            y: 50
        }
    };

    // Draw the visualization
    draw_activity_visualization();
}

/**
 * Function to draw the diagram with entity activity connections.
 * The function draws a column of box for each entity types and connects the entities with lines.
 */
function draw_activity_visualization() {

    // Create the SVG canvas
    let entity_svg = d3.selectAll('#entity-visualization')
        .append('svg')
        .attr('width', attributes.width_svg)
        .attr('height', attributes.height_svg)
        .attr('viewBox', [0, 0, attributes.width_svg, attributes.height_svg])
        .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Transition
    const t = entity_svg.transition().duration(750);

    // Determine the start positions for the boxes
    box_cutoffs = [0, 0.27, 0.54, 0.80];

    // Draw the entities
    drawEntities(paper_groups, 'GROUP', entity_svg, (attributes.width_svg * box_cutoffs[0] + 10), t);
    drawEntities(paper_categories, 'CATEGORY', entity_svg, (attributes.width_svg * box_cutoffs[1] + 10), t);
    // drawEntities(paper_titles, 'TITLE', entity_svg, (attributes.width_svg * box_cutoffs[2] + 10), t);
    drawEntities(paper_years, 'YEAR', entity_svg, (attributes.width_svg * box_cutoffs[2] + 10), t);
    drawEntities(paper_authors, 'AUTHOR', entity_svg, (attributes.width_svg * box_cutoffs[3] + 10), t);


    // Draw the connections
    drawEntityConnections(entity_svg);
}

/**
 * Function to draw the entities
 * @param entity_items array of entities
 * @param entity_type type of the entity
 * @param entity_svg svg element
 * @param x_position x position of the entity
 * @param transition transition animation
 */
function drawEntities(entity_items, entity_type, entity_svg, x_position, transition) {
    // Draw the entities of different types

    console.log(entity_items);

    // Draw the entity label
    const entity_label = entity_svg
        .append('text')
        .attr('class', 'entity-label entity-label-' + entity_type.toLowerCase())
        .attr('x', x_position)
        .attr('y', '12')
        .attr('font-size', '15')
        .attr('font-weight', 'bold')
        .text(entity_type);

    // Draw the entity boxes
    const entity_groups = entity_svg
        .selectAll('.entity-box-' + entity_type.toLowerCase())
        .data(entity_items)
        .join('g')
        .attr('class', d => 'entity-box entity-box-' + entity_type.toLowerCase() + ' entity-box-' + d[entity_type.toLowerCase()].replace(/[^a-zA-Z0-9]/g, '-'))
        .append('rect')
        .attr('class', d => 'rect rect-' + d[entity_type.toLowerCase()].replace(/[^a-zA-Z0-9]/g, '-') + ' entity-rect entity-rect-' + entity_type.toLowerCase())
        .on('mouseover', handleMouseOverRect)
        .on('mouseout', handleMouseOutRect)
        .on('click', handleMouseClickRect)
        .attr('x', x_position)
        .attr('y', (d, i) => 10 + (i + 1) * 20)
        .attr('width', '250')
        .attr('height', '15')
        .attr('opacity', 1)
        .transition(transition)
        .attr('data-entity-type', entity_type.toLowerCase())
        .attr('data-index', d => {
            return d['paper_index'].join(',');
        });

    // Draw the entity names
    const entity_texts = entity_svg
        .selectAll('.entity-box-' + entity_type.toLowerCase())
        .data(entity_items)
        .append('text')
        .attr('class', 'entity-text entity-text-' + entity_type.toLowerCase())
        .attr('x', x_position + 5)
        .attr('y', (d, i) => 22 + (i + 1) * 20)
        .text(d => d[entity_type.toLowerCase()])
        .on('mouseover', handleMouseOverRect)
        .on('mouseout', handleMouseOutRect)
        .on('click', handleMouseClickRect)
        .transition(transition)
        .attr('data-entity-type', entity_type.toLowerCase())
        .attr('data-index', d => {
            return d['paper_index'].join(',');
        });
}

/**
 * Function to draw the connections between the entities
 * @param entity_svg the svg element to draw on
 */
function drawEntityConnections(entity_svg) {
    // Draw the Group - Category connections
    paper_groups.forEach((pg, pgi) => {
        let x_pos_from = 250 + 10;
        let y_pos_from = 0;
        let x_pos_to = attributes.width_svg * box_cutoffs[1] + 10;
        let y_pos_to = 0;

        let related_categories = [];
        let paper_sources = papers.filter((p, pi) => {
            paper_categories.forEach(pc => {
                if(pc['paper_index'].includes(pi)) {
                    related_categories.push(pc);
                }
            }, pi);
            return pg['paper_index'].includes(pi);
        });
        console.log(pg);

        if(related_categories.length > 0) {
            related_categories.forEach((rc, rci) => {
                y_pos_from = 15 + (pgi + 1) * 20;
                y_pos_to = 15 + (rci + 1) * 20;

                const link = d3.linkHorizontal()({
                    source: [x_pos_from, y_pos_from],
                    target: [x_pos_to, y_pos_to]
                });
                console.log(rc);

                entity_svg.append('path')
                    .attr('d', link)
                    .attr('class', 'entity-connection entity-connection-group-category entity-connection-from-' + pg['group'].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + rc['category'].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    //.attr('stroke-width', where_items.length)
                    .attr('fill', 'none');
            });
        }
    });
    return;
    // Draw the WHERE - WHEN connections
    en_where.forEach(w => {
        let x_pos_from = 150 + attributes.width_svg * box_cutoffs[1] + 10;
        let y_pos_from = 0;
        let x_pos_to = attributes.width_svg * box_cutoffs[2] + 10;
        let y_pos_to = 0;

        // Get the files where the location is mentioned
        let entity_files = entities.filter(e => {
            return (e.entity === w && e.entity_type === 'GPE');
        }).map(e => e.file);

        // Get the dates where the location is mentioned
        let when_items = [...new Set(entities.filter(e => (e.entity_type === 'DATE' && entity_files.includes(e.file))).map(e => e.entity))];

        // Draw the connections between the location and date
        if (when_items.length > 0) {
            when_items.forEach(d => {
                y_pos_from = 15 + (en_where.indexOf(w) + 1) * 20;
                y_pos_to = 15 + (en_when.indexOf(d) + 1) * 20;

                const link = d3.linkHorizontal()({
                    source: [x_pos_from, y_pos_from],
                    target: [x_pos_to, y_pos_to]
                });

                entity_svg.append('path')
                    .attr('d', link)
                    .attr('class', 'entity-connection entity-connection-where-when entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    //.attr('stroke-width', when_items.length)
                    .attr('fill', 'none');
            });
        }
    });

    if (show_what) {
        // Draw the WHEN - WHAT connections
        en_when.forEach(d => {
            let x_pos_from = 150 + attributes.width_svg * box_cutoffs[2] + 10;
            let y_pos_from = 0;
            let x_pos_to = attributes.width_svg * box_cutoffs[3] + 10;
            let y_pos_to = 0;

            // Get the files where the date is mentioned
            let entity_files = entities.filter(e => {
                return (e.entity === d && e.entity_type === 'DATE');
            }).map(e => e.file);

            // Get the events where the date is mentioned
            let what_items = [...new Set(entities.filter(e => (e.entity_type === 'VERB' && entity_files.includes(e.file))).map(e => e.entity))];

            // Draw the connections between the date and event
            if (what_items.length > 0) {
                what_items.forEach(e => {
                    y_pos_from = 15 + (en_when.indexOf(d) + 1) * 20;
                    y_pos_to = 15 + (en_what.indexOf(e) + 1) * 20;

                    const link = d3.linkHorizontal()({
                        source: [x_pos_from, y_pos_from],
                        target: [x_pos_to, y_pos_to]
                    });

                    entity_svg.append('path')
                        .attr('d', link)
                        .attr('class', 'entity-connection entity-connection-when-what entity-connection-from-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        //.attr('stroke-width', what_items.length)
                        .attr('fill', 'none');
                });
            }
        });
    }
}

/**
 * Handle the mouse over event on a rectangle.
 * @param d
 * @param i
 *
 * @Todo: Optimize the code with reusable functions
 */
function handleMouseOverRect(d, i) {
    const entity_svg = d3.selectAll('#entity-visualization').select('svg');
    let who_items, when_items, where_items, what_items;

    // Dim all rectangles
    d3.selectAll('.entity-rect')
        .style('opacity', 0.1)
        .style('stroke-width', '0px')
        .style('stroke', 'none');
    d3.selectAll('.entity-box')
        .style('stroke-width', '0px')
        .style('stroke', 'none');

    // Highlight the current rectangle
    d3.select(d.target)
        .style('opacity', 1)
        .style('stroke-width', '1px')
        .style('stroke', 'black');

    // Highlight the connections
    let entity_type = d3.select(d.target).attr('data-entity-type');
    let entity_files = d3.select(d.target).attr('data-files').split(',');

    d3.selectAll('.entity-connection')
        .style('opacity', 0.05);
    // Highlight the connections
    d3.selectAll('.entity-connection-from-' + i.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .style('opacity', 1);
    d3.selectAll('.entity-connection-to-' + i.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .style('opacity', 1);

    if (entity_type === 'who') {
        // Highlight the connected WHERE rectangles
        where_items = [...new Set(entities.filter(e => (e.entity_type === 'GPE' && entity_files.includes(e.file))).map(e => e.entity))];

        where_items.forEach(w => {
            d3.selectAll('.entity-box-where.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);

            // Highlight the connected WHEN rectangles
            let where_when_entity_files = entities.filter(e => {
                return (e.entity === w && e.entity_type === 'GPE');
            }).map(e => e.file);
            when_items = [...new Set(entities.filter(e => (e.entity_type === 'DATE' && where_when_entity_files.includes(e.file))).map(e => e.entity))];

            when_items.forEach(d => {
                d3.selectAll('.entity-box-when.entity-box-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1)
                    .style('stroke-width', '1px')
                    .style('stroke', 'black');

                // Highlight the connections
                d3.selectAll('.entity-connection-from-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
                d3.selectAll('.entity-connection-to-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);

                if (show_what) {
                    // Highlight the connected WHAT rectangles
                    let when_what_entity_files = entities.filter(e => {
                        return (e.entity === d && e.entity_type === 'DATE');
                    }).map(e => e.file);

                    what_items = [...new Set(entities.filter(e => (e.entity_type === 'VERB' && when_what_entity_files.includes(e.file))).map(e => e.entity))];
                    what_items.forEach(e => {
                        d3.selectAll('.entity-box-what.entity-box-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                            .style('opacity', 1)
                            .style('stroke-width', '1px')
                            .style('stroke', 'black');

                        // Highlight the connections
                        d3.selectAll('.entity-connection-from-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                            .style('opacity', 1);
                        d3.selectAll('.entity-connection-to-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                            .style('opacity', 1);
                    });
                }
            });
        });

    } else if (entity_type === 'where') {
        // Highlight the connected WHO rectangles
        who_items = [...new Set(entities.filter(e => (e.entity_type === 'PERSON' && entity_files.includes(e.file))).map(e => e.entity))];

        who_items.forEach(w => {
            d3.selectAll('.entity-box-who.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
        });

        // Highlight the connected WHEN rectangles
        when_items = [...new Set(entities.filter(e => (e.entity_type === 'DATE' && entity_files.includes(e.file))).map(e => e.entity))];

        when_items.forEach(d => {
            d3.selectAll('.entity-box-when.entity-box-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);

            if (show_what) {
                // Highlight the connected WHAT rectangles
                let when_what_entity_files = entities.filter(e => {
                    return (e.entity === d && e.entity_type === 'DATE');
                }).map(e => e.file);

                what_items = [...new Set(entities.filter(e => (e.entity_type === 'VERB' && when_what_entity_files.includes(e.file))).map(e => e.entity))];
                what_items.forEach(w => {
                    d3.selectAll('.entity-box-what.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1)
                        .style('stroke-width', '1px')
                        .style('stroke', 'black');

                    // Highlight the connections
                    d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1);
                    d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1);
                });
            }
        });

    } else if (entity_type === 'when') {
        if (show_what) {
            // Highlight the connected WHAT rectangles
            what_items = [...new Set(entities.filter(e => (e.entity_type === 'VERB' && entity_files.includes(e.file))).map(e => e.entity))];

            what_items.forEach(e => {
                d3.selectAll('.entity-box-what.entity-box-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1)
                    .style('stroke-width', '1px')
                    .style('stroke', 'black');

                // Highlight the connections
                d3.selectAll('.entity-connection-from-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
                d3.selectAll('.entity-connection-to-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
            });
        }

        // Highlight the connected WHERE rectangles
        where_items = [...new Set(entities.filter(e => (e.entity_type === 'GPE' && entity_files.includes(e.file))).map(e => e.entity))];

        where_items.forEach(w => {
            d3.selectAll('.entity-box-where.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);

            // Highlight the connected WHO rectangles
            let where_who_entity_files = entities.filter(e => {
                return (e.entity === w && e.entity_type === 'GPE');
            }).map(e => e.file);

            who_items = [...new Set(entities.filter(e => (e.entity_type === 'PERSON' && where_who_entity_files.includes(e.file))).map(e => e.entity))];
            who_items.forEach(p => {
                d3.selectAll('.entity-box-who.entity-box-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1)
                    .style('stroke-width', '1px')
                    .style('stroke', 'black');

                // Highlight the connections
                d3.selectAll('.entity-connection-from-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
                d3.selectAll('.entity-connection-to-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
            });
        });
    } else if (entity_type === 'what') {
        // Highlight the connected WHEN rectangles
        when_items = [...new Set(entities.filter(e => (e.entity_type === 'DATE' && entity_files.includes(e.file))).map(e => e.entity))];

        when_items.forEach(d => {
            d3.selectAll('.entity-box-when.entity-box-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);

            // Highlight the connected WHERE rectangles
            let when_where_entity_files = entities.filter(e => {
                return (e.entity === d && e.entity_type === 'DATE');
            }).map(e => e.file);
            where_items = [...new Set(entities.filter(e => (e.entity_type === 'GPE' && when_where_entity_files.includes(e.file))).map(e => e.entity))];

            where_items.forEach(w => {
                d3.selectAll('.entity-box-where.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1)
                    .style('stroke-width', '1px')
                    .style('stroke', 'black');

                // Highlight the connections
                d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
                d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);

                // Highlight the connected WHO rectangles
                let where_who_entity_files = entities.filter(e => {
                    return (e.entity === w && e.entity_type === 'GPE');
                }).map(e => e.file);

                who_items = [...new Set(entities.filter(e => (e.entity_type === 'PERSON' && where_who_entity_files.includes(e.file))).map(e => e.entity))];
                who_items.forEach(p => {
                    d3.selectAll('.entity-box-who.entity-box-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1)
                        .style('stroke-width', '1px')
                        .style('stroke', 'black');

                    // Highlight the connections
                    d3.selectAll('.entity-connection-from-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1);
                    d3.selectAll('.entity-connection-to-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1);
                });
            });

        });
    }
}

/**
 * Handle the mouse out event on a rectangle.
 * @param d
 * @param i
 */
function handleMouseOutRect(d, i) {
    // Reset the rectangles
    // d3.selectAll('.entity-box')
    //     .style('opacity', 0.7)
    //     .attr('stroke', 'none')
    //     .style('stroke-width', '0px');
}

/**
 * Handle the mouse click event on a rectangle.
 * @param d
 * @param i
 */
function handleMouseClickRect(d, i) {
    d3.select('#entity-texts').html('');
    let entity_files = d3.select(d.target).attr('data-files').split(',');
    entity_files.forEach(f => {
        let render_htmls = renders.filter(r => r.file === f);
        render_htmls.forEach(r => {
            d3.select('#entity-texts').append('div').append('h4').html('Source: ' + r.file.split('.')[0].toUpperCase());
            d3.select('#entity-texts').append('div').html(r.render);
            d3.select('#entity-texts').append('hr');
        });
    });

    document.getElementById('entity-texts').scrollIntoView({behavior: "smooth"});
}

/**
 * Clear the visualization.
 */
function clean_slate() {
    d3.select('#entity-visualization').html('');
    d3.select('#entity-texts').html('');
}

/**
 * Redraw the visualization.
 */
function redraw_visualization() {
    clean_slate();
    attributes.height_svg = (show_what ? (d3.max([en_persons.length, en_where.length, en_when.length, en_what.length]) * 20 + 40) : (d3.max([en_persons.length, en_where.length, en_when.length]) * 20) + 40);
    draw_activity_visualization()
}
