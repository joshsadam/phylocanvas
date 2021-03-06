/**
 * Draws a branch.
 *
 * @class
 */
class BranchRenderer {

  /**
   * @constructor
   * @param {Object} options
   * @param {function} options.draw
   * @param {function} [options.prepareChild]
   */
  constructor(options) {
    if (!options || !options.draw) {
      throw new Error('`draw` function is required for branch renderers');
    }

    this.draw = options.draw;
    this.prepareChild = options.prepareChild;
  }

  /**
   * @param {Tree}
   * @param {Branch}
   * @param {boolean=} - if true, rendering skipped.
   */
  render(tree, branch, collapse) {
    var i;
    if (collapse || !branch) return;

    if (branch.selected) {
      branch.canvas.fillStyle = tree.selectedColour;
    } else {
      branch.canvas.fillStyle = branch.colour;
    }
    branch.canvas.strokeStyle = branch.getColour();

    this.draw(tree, branch);

    if (branch.pruned) {
      return;
    }

    branch.drawNode();

    for (i = 0; i < branch.children.length; i++) {
      if (this.prepareChild) {
        this.prepareChild(branch, branch.children[i]);
      }
      this.render(tree, branch.children[i], branch.collapsed || collapse);
    }
  }

}

export default BranchRenderer;
