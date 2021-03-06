items = new Mongo.Collection("items");
 
if (Meteor.isServer) {
  // This code only runs on the server
    // Only publish items that are public or belong to the current user
  Meteor.publish("items", function () {
    return items.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}
 
if (Meteor.isClient) {
  // This code only runs on the client
    Meteor.subscribe("items");
 
  Template.body.helpers({
    items: function () {
       if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter items
        return items.find({checked: {$ne: true}}, {sort: {}});
      } else {
        // Otherwise, return all of the items
        return items.find({}, {sort: {}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return items.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-item": function (event) {
      // Prevent default browser form submit
      event.preventDefault();
 
        //THIS IS WHERE TO FIX SUBMIT
      // Get value from form element
      var text = event.target.text.value;
 
      // Insert a item into the collection
      Meteor.call("additem", text);
 
      // Clear form
      event.target.text.value = "";
      },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
      }
  });

  Template.item.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });
 
  Template.item.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteitem", this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}
 
Meteor.methods({
  additem: function (text) {
    // Make sure the user is logged in before inserting a item
    if (! Meteor.userId() || Meteor.user().username != "admin") {
        throw new Meteor.Error("not-authorized");
    }
 
    items.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username,
      type: type
    });
  },
  deleteitem: function (itemId) {
     var item = items.findOne(itemId);
    if (item.private && item.owner !== Meteor.userId()) {
      // If the item is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }
 
    items.remove(itemId);
  },
  setChecked: function (itemId, setChecked) {
    var item = items.findOne(itemId);
    if (item.private && item.owner !== Meteor.userId()) {
      // If the item is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }
 
    items.update(itemId, { $set: { checked: setChecked} });
    },
  setPrivate: function (itemId, setToPrivate) {
    var item = items.findOne(itemId);
 
    // Make sure only the item owner can make a item private
    if (item.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
 
    items.update(itemId, { $set: { private: setToPrivate } });
  }
});