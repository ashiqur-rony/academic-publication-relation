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

let default_entities = [
    {
        'entity': 'group',
        'order': 1
    },
    {
        'entity': 'category',
        'order': 2
    },
    {
        'entity': 'year',
        'order': 3
    },
    {
        'entity': 'author',
        'order': 4
    }
];

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

    // d3.select('#reset-button').on('click', function () {
    //     redraw_visualization();
    // });
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
        height_svg: (d3.max([paper_groups.length, paper_categories.length, paper_authors.length, paper_years.length]) * 20 + 40),
        margin: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        },
        axis: {
            x: 50,
            y: 50
        },
        width_entity: {
            group: 250,
            category: 250,
            year: 150,
            author: 250
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
    box_cutoffs = [0, 0.27, 0.54, 0.72];

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
        .attr('class', (d, i) => 'entity-box entity-box-' + entity_type.toLowerCase() + ' entity-box-' + d[entity_type.toLowerCase()].replace(/[^a-zA-Z0-9]/g, '-') + ' entity-index-' + i)
        .append('rect')
        .attr('class', (d, i) => 'rect rect-' + d[entity_type.toLowerCase()].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + ' entity-rect entity-rect-' + entity_type.toLowerCase() + ' entity-index-' + i)
        .on('mouseover', handleMouseOverRect)
        .on('mouseout', handleMouseOutRect)
        .on('click', handleMouseClickRect)
        .attr('x', x_position)
        .attr('y', (d, i) => 10 + (i + 1) * 20)
        .attr('width', attributes['width_entity'][entity_type.toLowerCase()])
        .attr('height', '15')
        .attr('opacity', 1)
        .transition(transition)
        .attr('data-entity-index', (d, i) => i)
        .attr('data-entity-type', entity_type.toLowerCase())
        .attr('data-index', d => {
            return [...new Set(d['paper_index'])].join(',');
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
        // .on('mouseover', handleMouseOverRect)
        // .on('mouseout', handleMouseOutRect)
        .on('click', handleMouseClickRect)
        .transition(transition)
        .attr('data-entity-type', entity_type.toLowerCase())
        .attr('data-index', d => {
            return [...new Set(d['paper_index'])].join(',');
        });
}

/**
 * Function to draw the connections between the entities
 * @param entity_svg the svg element to draw on
 */
function drawEntityConnections(entity_svg) {
    // Draw the Group - Category connections
    paper_groups.forEach((pg, pgi) => {
        let x_pos_from = attributes.width_entity.group + 10; // Width of the first box + margin
        let y_pos_from = 0;
        let x_pos_to = attributes.width_svg * box_cutoffs[1] + 10; // Start of the second box + margin
        let y_pos_to = 0;

        // Create a list of categories for each group.
        // And a list of papers for each category.
        let related_categories = [];
        let paper_sources = papers.filter((p, pi) => {
            return pg['paper_index'].includes(pi);
        });

        paper_categories.forEach((pc, pci) => {
            // Get the list of common papers between the group and category
            let group_category_papers = pc['paper_index'].filter(pc_paper => {
                return pg['paper_index'].includes(pc_paper);
            }, pg);

            if (group_category_papers.length > 0) {
                if (related_categories.indexOf(pci) === -1) {
                    related_categories.push(pci);
                }
            }
        });

        if (related_categories.length > 0) {

            related_categories.forEach((rci) => {
                y_pos_from = 15 + (pgi + 1) * 20;
                y_pos_to = 15 + (rci + 1) * 20;

                const link = d3.linkHorizontal()({
                    source: [x_pos_from, y_pos_from],
                    target: [x_pos_to, y_pos_to]
                });

                entity_svg.append('path')
                    .attr('d', link)
                    .attr('class', 'entity-connection entity-connection-group-category entity-connection-from-' + pg['group'].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + paper_categories[rci]['category'].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    //.attr('stroke-width', where_items.length)
                    .attr('fill', 'none');

                d3.select('rect.entity-rect-category.entity-index-' + rci).attr('data-related-group', d => {
                    let current_related_groups = d3.select('rect.entity-rect-category.entity-index-' + rci).attr('data-related-group');
                    if (current_related_groups === null) {
                        return pgi;
                    } else {
                        return [...new Set(current_related_groups.split(',')), pgi].join(',');
                    }
                });
            });

            d3.select('rect.entity-rect-group.entity-index-' + pgi).attr('data-related-category', related_categories.join(','));
        }
    });

    // Draw the CATEGORY - YEAR connections
    paper_categories.forEach((pc, pci) => {
        let x_pos_from = attributes.width_entity.category + attributes.width_svg * box_cutoffs[1] + 10;
        let y_pos_from = 0;
        let x_pos_to = attributes.width_svg * box_cutoffs[2] + 10;
        let y_pos_to = 0;

        // Create a list of years for each category.
        let related_years = [];
        let paper_sources = papers.filter((p, pi) => {
            return pc['paper_index'].includes(pi);
        });

        paper_years.forEach((py, pyi) => {
            // Get the list of common papers between the group and category
            let category_year_papers = py['paper_index'].filter(py_paper => {
                return pc['paper_index'].includes(py_paper);
            }, pc);

            if (category_year_papers.length > 0) {
                if (related_years.indexOf(pyi) === -1) {
                    related_years.push(pyi);
                }
            }
        });

        if (related_years.length > 0) {
            related_years.forEach((ryi) => {
                y_pos_from = 15 + (pci + 1) * 20;
                y_pos_to = 15 + (ryi + 1) * 20;

                const link = d3.linkHorizontal()({
                    source: [x_pos_from, y_pos_from],
                    target: [x_pos_to, y_pos_to]
                });

                entity_svg.append('path')
                    .attr('d', link)
                    .attr('class', 'entity-connection entity-connection-category-year entity-connection-from-' + pc['category'].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + paper_years[ryi]['year'].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    //.attr('stroke-width', where_items.length)
                    .attr('fill', 'none');

                d3.select('rect.entity-rect-year.entity-index-' + ryi).attr('data-related-category', d => {
                    let current_related_categories = d3.select('rect.entity-rect-year.entity-index-' + ryi).attr('data-related-category');
                    if (current_related_categories === null) {
                        return pci;
                    } else {
                        return [...new Set(current_related_categories.split(',')), pci].join(',');
                    }
                });
            });

            d3.select('rect.entity-rect-category.entity-index-' + pci).attr('data-related-year', related_years.join(','));
        }
    });

    // Draw the YEAR - AUTHOR connections
    paper_years.forEach((py, pyi) => {
        let x_pos_from = attributes.width_entity.year + attributes.width_svg * box_cutoffs[2] + 10;
        let y_pos_from = 0;
        let x_pos_to = attributes.width_svg * box_cutoffs[3] + 10;
        let y_pos_to = 0;

        // Create a list of years for each category.
        let related_authors = [];
        let paper_sources = papers.filter((p, pi) => {
            return py['paper_index'].includes(pi);
        });

        paper_authors.forEach((pa, pai) => {
            // Get the list of common papers between the group and category
            let year_author_papers = pa['paper_index'].filter(pa_paper => {
                return py['paper_index'].includes(pa_paper);
            }, py);

            if (year_author_papers.length > 0) {
                if (related_authors.indexOf(pai) === -1) {
                    related_authors.push(pai);
                }
            }
        });

        if (related_authors.length > 0) {
            related_authors.forEach((rai) => {
                y_pos_from = 15 + (pyi + 1) * 20;
                y_pos_to = 15 + (rai + 1) * 20;

                const link = d3.linkHorizontal()({
                    source: [x_pos_from, y_pos_from],
                    target: [x_pos_to, y_pos_to]
                });

                entity_svg.append('path')
                    .attr('d', link)
                    .attr('class', 'entity-connection entity-connection-year-author entity-connection-from-' + py['year'].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + paper_authors[rai]['author'].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    //.attr('stroke-width', where_items.length)
                    .attr('fill', 'none');

                d3.select('rect.entity-rect-author.entity-index-' + rai).attr('data-related-year', d => {
                    let current_related_years = d3.select('rect.entity-rect-author.entity-index-' + rai).attr('data-related-year');
                    if (current_related_years === null) {
                        return pyi;
                    } else {
                        return [...new Set(current_related_years.split(',')), pyi].join(',');
                    }
                });
            });

            d3.select('rect.entity-rect-year.entity-index-' + pyi).attr('data-related-author', related_authors.join(','));
        }
    });
}

/**
 * Function to handle the mouse over event on a rectangle.
 * @param entity_svg
 * @param entity_type
 * @param current_entity
 * @param target_element
 */
function highlightEntityConnections(entity_svg, entity_type, current_entity, target_element) {
    // Highlighted related elements to the left
    highlightLeftEntityConnections(entity_svg, entity_type, current_entity, target_element);
    // Highlight related elements to the right
    highlightRightEntityConnections(entity_svg, entity_type, current_entity, target_element);
}

/**
 * Highlight the connections to the left of the current entity
 * @param entity_svg
 * @param entity_type
 * @param current_entity
 * @param target_element
 */
function highlightLeftEntityConnections(entity_svg, entity_type, current_entity, target_element) {
    // Highlight the immediate connections
    d3.selectAll('.entity-connection.entity-connection-from-' + current_entity[entity_type].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .classed('dim', false);
    d3.selectAll('.entity-connection.entity-connection-to-' + current_entity[entity_type].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .classed('dim', false);

    // Highlight current target element
    highlightEntity(entity_svg, target_element);

    let left_entities = [];
    let current_entity_order = default_entities.filter(e => e.entity === entity_type)[0].order;

    default_entities.forEach(e => {
        if (e.order < current_entity_order) {
            left_entities.push(e);
        }
    });

    left_entities.sort((a, b) => b['order'] - a['order']);

    // Go left
    left_entities.forEach(e => {
        if (target_element.attr('data-related-' + e['entity'].toLowerCase())) {
            let related_entities = target_element.attr('data-related-' + e['entity'].toLowerCase()).split(',');
            related_entities.forEach(re => {
                let next_target = d3.select('rect.entity-rect-' + e['entity'].toLowerCase() + '.entity-index-' + re);
                highlightLeftEntityConnections(entity_svg, e['entity'], next_target.data()[0], next_target);
            });
        }
    });
}

/**
 * Highlight the connections to the right of the current entity
 * @param entity_svg
 * @param entity_type
 * @param current_entity
 * @param target_element
 */
function highlightRightEntityConnections(entity_svg, entity_type, current_entity, target_element) {
    // Highlight the immediate connections
    d3.selectAll('.entity-connection.entity-connection-from-' + current_entity[entity_type].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .classed('dim', false);
    d3.selectAll('.entity-connection.entity-connection-to-' + current_entity[entity_type].toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .classed('dim', false);

    // Highlight current target element
    highlightEntity(entity_svg, target_element);

    let right_entities = [];
    let current_entity_order = default_entities.filter(e => e.entity === entity_type)[0].order;

    default_entities.forEach(e => {
        if (e.order > current_entity_order) {
            right_entities.push(e);
        }
    });

    right_entities.sort((a, b) => a['order'] - b['order']);

    // Go right
    right_entities.forEach(e => {
        if (target_element.attr('data-related-' + e['entity'].toLowerCase())) {
            let related_entities = target_element.attr('data-related-' + e['entity'].toLowerCase()).split(',');
            related_entities.forEach(re => {
                let next_target = d3.select('rect.entity-rect-' + e['entity'].toLowerCase() + '.entity-index-' + re);
                highlightRightEntityConnections(entity_svg, e['entity'], next_target.data()[0], next_target);
            });
        }
    });
}

function highlightEntity(entity_svg, target_element) {
    target_element
        .style('opacity', 1)
        .style('stroke-width', '1px')
        .style('stroke', 'black');
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

    // First we hide existing connections
    d3.selectAll('.entity-connection')
        .classed('dim', true);

    // Dim all rectangles
    d3.selectAll('.entity-rect')
        .style('opacity', 0.1)
        .style('stroke-width', '0px')
        .style('stroke', 'none');
    d3.selectAll('.entity-box')
        .style('stroke-width', '0px')
        .style('stroke', 'none');

    // Highlight the connections
    let entity_type = d3.select(d.target).attr('data-entity-type');

    // Highlight the connected elements recursively
    highlightEntityConnections(entity_svg, entity_type, i, d3.select(d.target));
}

/**
 * Handle the mouse out event on a rectangle.
 * @param d
 * @param i
 */
function handleMouseOutRect(d, i) {
    // Reset the rectangles
    d3.selectAll('.entity-box')
        .style('opacity', 1)
        .attr('stroke', 'none')
        .style('stroke-width', '0px');
    // Reset the connections
    d3.selectAll('.entity-connection')
        .classed('dim', false);
}

/**
 * Handle the mouse click event on a rectangle.
 * @param d
 * @param i
 */
function handleMouseClickRect(d, i) {
    d3.select('#entity-texts').html('');
    let paper_indexes = d3.select(d.target).attr('data-index').split(',');
    let papers_selected = [];
    if(paper_indexes.length > 0) {
        papers_selected = papers.filter((p, pi) => {
            return paper_indexes.includes(pi.toString());
        });
    }

    console.log(papers_selected);
    console.log(d, i);

    papers_selected.forEach(p => {
        let title = p['Title'];
        let abstract = p['Abstract'];
        let authors = eval(p['Authors']);
        let publication_year = p['Publication year'];

        d3.select('#entity-texts').append('div').append('h4').html(title);
        d3.select('#entity-texts').append('div').append('p').html('[' + publication_year + '] ' + authors.join(', '));
        d3.select('#entity-texts').append('div').html(abstract);
        d3.select('#entity-texts').append('hr');
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
