items = new Mongo.Collection("items");

// Routing definitions go here! ------------------------------------
Router.configure({
  layoutTemplate: 'main'
});
Router.route('/', {
  name: 'home',
  template: 'home'
});
Router.route('/register', {
  name: 'register'

});

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

  // Give authorized users access to sensitive data by group
  // Haven't figured this out yet
  // Meteor.publish('register', function () {
  //   if (Roles.userIsInRole(this.userId, ['admin'], 'default-group')) {

  //     return Meteor.register.find({group: 'default-group'});

  //   } else {

  //     // user not authorized. do not publish secrets
  //     this.stop();
  //     return;

  //   }
  // });

  Meteor.methods({
    adduser: function (email, password, firstname, lastname, mitid, role) {
      // check if admin
      var id;
      id = Accounts.createUser({
        email: email,
        password: password,
        profile: {
          firstname: firstname,
          lastname: lastname,
          mitid: mitid, 
          role: role
        }
      });
      Roles.addUsersToRoles(id, role, "default-group");
    }
  });
  
}
 
if (Meteor.isClient) {
  // This code only runs on the client
    // Meteor.subscribe("items");
 
  Template.home.helpers({
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

  Template.home.events({
    "submit .new-item": function (event) {
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get values from form element
      var name = event.target.name.value;
      var type = event.target.type.value;
      var location = event.target.location.value;
      var accessories = event.target.accessories.value;
 
      // Insert a item into the collection
      Meteor.call("additem", name, type, location, accessories);
 
      // Clear form
      event.target.name.value = "";
      event.target.type.value = "";
      event.target.location.value = "";
      event.target.accessories.value = "";
      },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
      }
  });

  Template.register.events({
    'submit .register': function (event, template){
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get values from form element
      var email = event.target.email.value;
      var password = event.target.password.value;
      var firstname = event.target.firstname.value;
      var lastname = event.target.lastname.value;
      var mitid = event.target.mitid.value;
      //which box is checked
      var role = template.find('input:radio[name=rolesoptions]:checked').value;
      console.log("email: " + email + ", password: " + password + ", name: " + firstname + " " + lastname + ", mit id: " + mitid + ", role: " + role);

      // Insert a item into the collection
      Meteor.call("adduser", email, password, firstname, lastname, mitid, role);

      // Clear form
      event.target.email.value = "";
      event.target.password.value = "";
      event.target.firstname.value = "";
      event.target.lastname.value = "";
      event.target.mitid.value = "";
      //uncheck roles

    }
  })

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
    passwordSignupFields: "EMAIL_ONLY"
  });
}
 
Meteor.methods({
  
  additem: function (name, type, location, accessories) {
    // Make sure the user is logged in before inserting a item
    if (! Meteor.userId() || Meteor.user().profile.role != "admin") {
        throw new Meteor.Error("not-authorized");
    }
 
    items.insert({
      name: name,
      type: type,
      location: location,
      accessories: accessories,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
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